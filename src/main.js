import {
  DEFAULT_BUDDY_SETTINGS,
  LIFTS,
  activeLiftIds,
  formatKg,
  generateBuddyProgram,
  liftLabel,
  normalizeBuddySettings
} from "./buddy-method.js";
import { readJsonStorage, readStorageValue, STORAGE_KEYS, writeJsonStorage, writeStorageValue } from "./storage.js";
import { bindLifterProfileHome, renderLifterProfileHome } from "./lifter-profile.js";
import { bindMeetCockpit, renderMeetCockpit } from "./meet-cockpit.js";
import {
  FATIGUE_LABELS,
  FORM_QUALITY_LABELS,
  latestLog,
  nextTrainingFromLogs,
  readLogs,
  recommendationForLog,
  renderTrainingLog,
  workTypeLabel
} from "./training-log.js";

const app = document.querySelector("#app");
const navItems = Array.from(document.querySelectorAll(".nav-item"));

const views = {
  home: "HOME",
  plan: "PLAN",
  log: "LOG",
  data: "DATA",
  meet: "MEET"
};

function readSettings() {
  return normalizeBuddySettings(readJsonStorage(STORAGE_KEYS.buddyMethodSettings, DEFAULT_BUDDY_SETTINGS));
}

function saveSettings(settings) {
  writeJsonStorage(STORAGE_KEYS.buddyMethodSettings, normalizeBuddySettings(settings));
}

function readStoredView() {
  const storedView = readStorageValue(STORAGE_KEYS.activeView, "home");
  return Object.prototype.hasOwnProperty.call(views, storedView) ? storedView : "home";
}

function writeStoredView(viewName) {
  if (Object.prototype.hasOwnProperty.call(views, viewName)) {
    writeStorageValue(STORAGE_KEYS.activeView, viewName);
  }
}

function escapeText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
  return escapeText(value).replace(/"/g, "&quot;");
}

function renderHome() {
  const settings = readSettings();
  const program = generateBuddyProgram(settings);

  app.innerHTML = renderLifterProfileHome({ settings, program });
  bindLifterProfileHome(app, {
    onNavigate: navigate,
    onRefresh: renderHome
  });
}

function renderPlan() {
  const settings = readSettings();
  const program = generateBuddyProgram(settings);
  const logs = readLogs();
  const nextTraining = nextTrainingFromLogs(program, logs);
  const focusWeek = nextTraining.isComplete ? program.weeks.length : nextTraining.week;

  app.innerHTML = `
    <section class="hero-panel" aria-labelledby="screen-title">
      <p class="screen-label">PLAN</p>
      <h2 id="screen-title" class="screen-title">Buddy Method プラン生成</h2>
      <p class="screen-copy">スマホでは次に行うDayを中心に表示します。全体はWeekを開いて確認できます。</p>
    </section>

    ${renderSettingsForm(settings)}
    ${renderProgramSummary(program)}
    ${renderPredictionPanel(program)}
    ${renderPlanFocus(program, nextTraining, focusWeek)}
    ${renderWeekList(program, focusWeek)}
  `;

  bindSettingsForm(settings);
  bindPlanNavigation(focusWeek);
}

function renderLog() {
  renderTrainingLog({ app, settings: readSettings() });
}

function renderData() {
  const settings = readSettings();
  const program = generateBuddyProgram(settings);
  const logs = readLogs();

  app.innerHTML = `
    <section class="hero-panel" aria-labelledby="screen-title">
      <p class="screen-label">DATA</p>
      <h2 id="screen-title" class="screen-title">LOGから次回重量を判断</h2>
      <p class="screen-copy">複雑なグラフより、直近e1RM、RPE、疲労、フォームから次回の保守的な判断を表示します。</p>
    </section>
    ${renderDataSummary(logs)}
    ${renderLogAnalysis(program, logs)}
    <section class="detail-card">
      <div class="section-heading">
        <span>到達候補</span>
        <strong>PLAN設定からの目安</strong>
      </div>
      <p>${program.lifts.map((lift) => `${liftLabel(lift)} ${program.projections[lift].label}`).join(" / ")}</p>
    </section>
  `;
}

function renderMeet() {
  const settings = readSettings();
  const program = generateBuddyProgram(settings);
  const logs = readLogs();

  app.innerHTML = renderMeetCockpit({ settings, program, logs });
  bindMeetCockpit(app, {
    settings,
    program,
    logs,
    onRefresh: renderMeet
  });
}

function renderSettingsForm(settings) {
  const activeLifts = activeLiftIds(settings);
  const isBenchOnly = settings.target === "bench_only";

  return `
    <section class="settings-panel" aria-label="Program settings">
      <form class="settings-form" data-settings-form>
        <label>
          <span>対象</span>
          <select name="target" data-field="target">
            ${option("big3", "BIG3", settings.target)}
            ${option("bench_only", "ベンチプレスのみ", settings.target)}
          </select>
        </label>

        <label>
          <span>期間</span>
          <select name="length" data-field="length">
            ${option(4, "4週間", settings.length)}
            ${option(8, "8週間", settings.length)}
            ${option(12, "12週間", settings.length)}
          </select>
        </label>

        <label>
          <span>週回数</span>
          <select name="daysPerWeek" data-field="daysPerWeek">
            ${option(3, "週3回", settings.daysPerWeek)}
            ${option(4, "週4回", settings.daysPerWeek)}
            ${option(5, "週5回", settings.daysPerWeek)}
          </select>
        </label>

        <label>
          <span>補助種目</span>
          <select name="accessoryVolume" data-field="accessoryVolume">
            ${option("low", "少なめ", settings.accessoryVolume)}
            ${option("normal", "普通", settings.accessoryVolume)}
            ${option("high", "多め", settings.accessoryVolume)}
          </select>
        </label>

        <label>
          <span>経験レベル</span>
          <select name="experienceLevel" data-field="experienceLevel">
            ${option("beginner", "初級", settings.experienceLevel)}
            ${option("intermediate", "中級", settings.experienceLevel)}
            ${option("advanced", "上級", settings.experienceLevel)}
          </select>
        </label>

        <label>
          <span>重点種目</span>
          <select name="priorityLift" data-field="priorityLift" ${isBenchOnly ? "disabled" : ""}>
            ${option("total", "バランス型", settings.priorityLift)}
            ${option("squat", "スクワット", settings.priorityLift)}
            ${option("bench", "ベンチプレス", settings.priorityLift)}
            ${option("deadlift", "デッドリフト", settings.priorityLift)}
          </select>
        </label>

        <div class="max-inputs" aria-label="Current one rep max inputs">
          ${activeLifts.map((lift) => maxInput(lift, settings.maxes[lift])).join("")}
        </div>

        <button class="primary-action" type="submit">保存して生成</button>
        <p class="form-note" data-save-status>設定はこの端末のlocalStorageに保存されます。</p>
      </form>
    </section>
  `;
}

function renderProgramSummary(program) {
  const settings = program.settings;
  const maxText = program.lifts.map((lift) => `${LIFTS[lift].short} ${formatKg(settings.maxes[lift])}kg`).join(" / ");

  return `
    <section class="program-summary" aria-label="Program summary">
      <div>
        <span>プログラム概要</span>
        <strong>${program.summary.targetLabel} / ${program.summary.lengthLabel} / ${program.summary.frequencyLabel}</strong>
      </div>
      <div>
        <span>現在1RM</span>
        <strong>${escapeText(maxText)}</strong>
      </div>
      <div>
        <span>補助量・経験・重点</span>
        <strong>${program.summary.accessoryLabel} / ${program.summary.experienceLabel} / ${program.summary.priorityLabel}</strong>
      </div>
    </section>
  `;
}

function renderPredictionPanel(program) {
  return `
    <section class="prediction-panel" aria-label="Projected PR ranges">
      <div class="section-heading">
        <span>最終週の到達候補</span>
        <strong>予測PR目安</strong>
      </div>
      <div class="prediction-grid">
        ${program.lifts.map((lift) => `
          <article>
            <span>${LIFTS[lift].short}</span>
            <strong>${escapeText(program.projections[lift].label)}</strong>
            <p>${escapeText(liftLabel(lift))}</p>
          </article>
        `).join("")}
      </div>
      <p class="panel-note">数値は命令ではなく到達目安です。RPEが高い日は維持か減量を優先します。</p>
    </section>
  `;
}

function renderPlanFocus(program, nextTraining, focusWeek) {
  const nextWeek = Math.min(program.weeks.length, Math.max(1, focusWeek + 1));
  const finalWeek = program.weeks.length;

  return `
    <section class="plan-focus-card" aria-label="Plan focus">
      <div class="section-heading">
        <span>今見るところ</span>
        <strong>${nextTraining.isComplete ? "プログラム完了" : `Week ${nextTraining.week} / Day ${nextTraining.day}`}</strong>
      </div>
      <p>${escapeText(nextTraining.isComplete ? "最終Dayまで保存済みです。DATAを確認して次のPLANを再生成してください。" : nextTraining.dayTitle)}</p>
      <div class="plan-jump-grid">
        <button type="button" data-plan-jump="${escapeAttribute(focusWeek)}">今週</button>
        <button type="button" data-plan-jump="${escapeAttribute(nextWeek)}">次週</button>
        <button type="button" data-plan-jump="${escapeAttribute(finalWeek)}">最終週</button>
      </div>
    </section>
  `;
}

function renderWeekList(program, focusWeek) {
  return `
    <section class="week-list" aria-label="Generated weekly plan" data-week-list>
      ${program.weeks.map((week) => `
        <details class="week-card" data-week-card="${week.week}" ${week.week === focusWeek ? "open" : ""}>
          <summary class="week-header">
            <div>
              <span>Week ${week.week}</span>
              <strong>${escapeText(week.phase.name)}</strong>
            </div>
            <p>${escapeText(week.phase.tone)}</p>
          </summary>
          <p class="week-note">${escapeText(week.note)}</p>
          <div class="day-list">
            ${week.days.map((day, index) => renderDayCard(day, index + 1)).join("")}
          </div>
        </details>
      `).join("")}
    </section>
  `;
}

function renderDataSummary(logs) {
  const lastLog = latestLog(logs);
  if (!lastLog) {
    return `
      <section class="detail-card data-empty-card">
        <div class="section-heading">
          <span>保存LOG</span>
          <strong>まだ分析待ち</strong>
        </div>
        <p>HOMEから今日の予定をLOGへ送り、トップセットを保存するとDATAに直近e1RMと次回判断が出ます。</p>
      </section>
    `;
  }

  const recommendation = recommendationForLog(lastLog);
  return `
    <section class="detail-card data-summary-card">
      <div class="section-heading">
        <span>直近LOG</span>
        <strong>${escapeText(liftLabel(lastLog.lift))} / ${escapeText(recommendation.label)}</strong>
      </div>
      <p>${escapeText(logLine(lastLog))}</p>
      <p>${escapeText(recommendation.note)}</p>
    </section>
  `;
}

function renderLogAnalysis(program, logs) {
  const liftCards = program.lifts.map((lift) => renderLiftAnalysisCard(lift, logs)).join("");

  return `
    <section class="data-card-grid metric-list" aria-label="Saved log analysis">
      ${liftCards}
    </section>
  `;
}

function renderLiftAnalysisCard(lift, logs) {
  const liftLogs = logs.filter((log) => log.lift === lift && log.workType !== "accessory");
  const latest = latestLog(liftLogs);

  if (!latest) {
    return `
      <article class="data-card">
        <div class="section-heading">
          <span>${escapeText(liftLabel(lift))}</span>
          <strong>LOG待ち</strong>
        </div>
        <p>この種目のトップセットを保存すると、直近e1RMと次回重量判断が表示されます。</p>
      </article>
    `;
  }

  const previous = liftLogs.filter((log) => log.id !== latest.id && log.e1rm).sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`))[0];
  const e1rmDiff = previous?.e1rm ? latest.e1rm - previous.e1rm : 0;
  const recommendation = recommendationForLog(latest);
  const recent = liftLogs.slice(0, 3);
  const rpeAverage = recent.length
    ? Math.round((recent.reduce((sum, log) => sum + Number(log.rpe || 0), 0) / recent.length) * 10) / 10
    : latest.rpe;

  return `
    <article class="data-card">
      <div class="section-heading">
        <span>${escapeText(liftLabel(lift))}</span>
        <strong>${escapeText(formatKg(latest.e1rm))}kg e1RM</strong>
      </div>
      <dl class="data-metrics">
        <div><dt>前回比</dt><dd>${escapeText(diffText(e1rmDiff))}</dd></div>
        <div><dt>RPE傾向</dt><dd>${escapeText(`平均 ${rpeAverage}`)}</dd></div>
        <div><dt>疲労感</dt><dd>${escapeText(FATIGUE_LABELS[latest.fatigue] || latest.fatigue)}</dd></div>
        <div><dt>フォーム</dt><dd>${escapeText(FORM_QUALITY_LABELS[latest.formQuality] || latest.formQuality)}</dd></div>
      </dl>
      <div class="recommendation-pill ${escapeAttribute(`is-${recommendation.tone}`)}">
        <span>次回重量判断</span>
        <strong>${escapeText(recommendation.label)}</strong>
      </div>
      <p>${escapeText(logLine(latest))}</p>
    </article>
  `;
}

function renderDayCard(day, dayNumber) {
  return `
    <article class="day-card" data-day-card>
      <header>
        <span>Day ${dayNumber}</span>
        <strong>${escapeText(day.title)}</strong>
      </header>
      <div class="work-list">
        ${day.items.map((item) => item.type === "main" ? mainWorkRow(item) : accessoryRow(item)).join("")}
      </div>
    </article>
  `;
}

function mainWorkRow(item) {
  return `
    <div class="work-row main-work" data-main-lift="${escapeAttribute(item.lift)}">
      <div>
        <span>${escapeText(item.label)}</span>
        <strong>${escapeText(item.prescription.title)}</strong>
      </div>
      <dl>
        <div><dt>%1RM</dt><dd>${escapeText(item.prescription.percent)}</dd></div>
        <div><dt>set</dt><dd>${escapeText(item.prescription.sets)}</dd></div>
        <div><dt>rep</dt><dd>${escapeText(item.prescription.reps)}</dd></div>
        <div><dt>RPE</dt><dd>${escapeText(item.prescription.rpe)}</dd></div>
      </dl>
      <p>${escapeText(item.prescription.note)}</p>
    </div>
  `;
}

function accessoryRow(item) {
  return `
    <div class="work-row accessory-work" data-accessory>
      <div>
        <span>補助</span>
        <strong>${escapeText(item.label)}</strong>
      </div>
      <p>${escapeText(item.work)} / ${escapeText(item.note)}</p>
    </div>
  `;
}

function bindSettingsForm(currentSettings) {
  const form = app.querySelector("[data-settings-form]");
  if (!form) return;

  form.addEventListener("change", (event) => {
    const nextSettings = settingsFromForm(form, currentSettings);
    saveSettings(nextSettings);
    if (event.target?.name === "target") renderPlan();
  });

  form.addEventListener("input", () => {
    const nextSettings = settingsFromForm(form, currentSettings);
    saveSettings(nextSettings);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextSettings = settingsFromForm(form, currentSettings);
    saveSettings(nextSettings);
    renderPlan();
  });
}

function bindPlanNavigation(focusWeek) {
  app.querySelectorAll("[data-plan-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      const weekNumber = Number(button.dataset.planJump || focusWeek);
      const card = app.querySelector(`[data-week-card="${weekNumber}"]`);
      if (!card) return;

      card.setAttribute("open", "");
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function settingsFromForm(form, previousSettings) {
  const formData = new FormData(form);
  const target = String(formData.get("target") || previousSettings.target);
  const priorityLift = target === "bench_only" ? "bench" : String(formData.get("priorityLift") || previousSettings.priorityLift);

  return normalizeBuddySettings({
    target,
    length: Number(formData.get("length") || previousSettings.length),
    daysPerWeek: Number(formData.get("daysPerWeek") || previousSettings.daysPerWeek),
    accessoryVolume: String(formData.get("accessoryVolume") || previousSettings.accessoryVolume),
    experienceLevel: String(formData.get("experienceLevel") || previousSettings.experienceLevel),
    priorityLift,
    maxes: {
      squat: formData.get("max-squat") ?? previousSettings.maxes.squat,
      bench: formData.get("max-bench") ?? previousSettings.maxes.bench,
      deadlift: formData.get("max-deadlift") ?? previousSettings.maxes.deadlift
    }
  });
}

function navigate(viewName) {
  if (!Object.prototype.hasOwnProperty.call(views, viewName)) return;

  if (viewName === "home") renderHome();
  if (viewName === "plan") renderPlan();
  if (viewName === "log") renderLog();
  if (viewName === "data") renderData();
  if (viewName === "meet") renderMeet();

  navItems.forEach((item) => {
    const isActive = item.dataset.view === viewName;
    item.classList.toggle("is-active", isActive);
    if (isActive) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });

  writeStoredView(viewName);
  app.focus({ preventScroll: true });
}

function option(value, label, currentValue) {
  return `<option value="${escapeAttribute(value)}" ${String(value) === String(currentValue) ? "selected" : ""}>${escapeText(label)}</option>`;
}

function maxInput(lift, value) {
  return `
    <label>
      <span>現在1RM ${LIFTS[lift].short}</span>
      <input name="max-${lift}" data-max-input="${lift}" type="number" inputmode="decimal" min="0" step="2.5" value="${escapeAttribute(value)}" />
    </label>
  `;
}

function logLine(log) {
  const pieces = [
    log.plan?.week && log.plan?.day ? `Week ${log.plan.week} / Day ${log.plan.day}` : "",
    log.workType ? workTypeLabel(log.workType) : "",
    log.weight ? `${formatKg(log.weight)}kg` : "",
    log.reps ? `${log.reps}rep` : "",
    log.sets ? `${log.sets}set` : "",
    log.rpe ? `RPE ${log.rpe}` : ""
  ].filter(Boolean);

  return pieces.join(" / ") || "保存LOGを確認してください。";
}

function diffText(value) {
  if (!value) return "比較待ち";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatKg(value)}kg`;
}

navItems.forEach((item) => {
  item.addEventListener("click", () => navigate(item.dataset.view));
});

navigate(readStoredView());
