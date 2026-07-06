import {
  DEFAULT_BUDDY_SETTINGS,
  LIFTS,
  activeLiftIds,
  accessoryVolumeLabel,
  experienceLabel,
  formatKg,
  generateBuddyProgram,
  liftLabel,
  normalizeBuddySettings
} from "./buddy-method.js";
import { readJsonStorage, readStorageValue, STORAGE_KEYS, writeJsonStorage, writeStorageValue } from "./storage.js";
import { renderTrainingLog } from "./training-log.js";

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
  const nextDay = program.weeks[0]?.days[0];
  const firstLift = activeLiftIds(settings)[0];
  const firstProjection = program.projections[firstLift];

  app.innerHTML = `
    <section class="hero-panel" aria-labelledby="screen-title">
      <p class="screen-label">HOME</p>
      <h2 id="screen-title" class="screen-title">今日のトレーニングを決める</h2>
      <p class="screen-copy">旧Platform BuddyのBuddy Method設定から、スマホで読めるPWA用プランを生成します。</p>
      <button class="primary-action" type="button" data-open-plan>PLANを開く</button>
    </section>

    <section class="summary-grid" aria-label="Saved program summary">
      ${summaryCard("対象", program.summary.targetLabel)}
      ${summaryCard("期間", program.summary.lengthLabel)}
      ${summaryCard("頻度", program.summary.frequencyLabel)}
      ${summaryCard("補助", program.summary.accessoryLabel)}
    </section>

    <section class="detail-card" aria-label="Today suggestion">
      <div class="section-heading">
        <span>Today</span>
        <strong>${escapeText(nextDay?.title || "PLAN未生成")}</strong>
      </div>
      <p>${escapeText(nextDay ? `${program.weeks[0].phase.name}: ${program.weeks[0].note}` : "PLANで設定を保存してください。")}</p>
    </section>

    <section class="detail-card" aria-label="Recent strength signal">
      <div class="section-heading">
        <span>最終週の目安</span>
        <strong>${escapeText(firstProjection?.label || "-")}</strong>
      </div>
      <p>${escapeText(liftLabel(firstLift))}の現在1RM ${formatKg(settings.maxes[firstLift])}kg からの到達候補です。命令ではなく、最終週の挑戦目安として扱います。</p>
    </section>

    <section class="buddy-note" aria-label="Buddy note">
      <span>Buddy note</span>
      <p>今日はまずPLANを確認。軽ければ少し足すより、予定RPEで白判定の形を残します。</p>
    </section>
  `;

  app.querySelector("[data-open-plan]")?.addEventListener("click", () => navigate("plan"));
}

function renderPlan() {
  const settings = readSettings();
  const program = generateBuddyProgram(settings);

  app.innerHTML = `
    <section class="hero-panel" aria-labelledby="screen-title">
      <p class="screen-label">PLAN</p>
      <h2 id="screen-title" class="screen-title">Buddy Method プラン生成</h2>
      <p class="screen-copy">対象、週数、頻度、補助量、現在1RMを入れると、Week / Dayカードでプログラムを生成します。</p>
    </section>

    ${renderSettingsForm(settings)}
    ${renderProgramSummary(program)}
    ${renderPredictionPanel(program)}
    ${renderWeekList(program)}
  `;

  bindSettingsForm(settings);
}

function renderLog() {
  renderTrainingLog({ app, settings: readSettings() });
}

function renderData() {
  const settings = readSettings();
  const program = generateBuddyProgram(settings);

  app.innerHTML = `
    <section class="hero-panel" aria-labelledby="screen-title">
      <p class="screen-label">DATA</p>
      <h2 id="screen-title" class="screen-title">現在1RMと到達候補</h2>
      <p class="screen-copy">複雑なグラフではなく、今の設定から見える強度目安だけを表示します。</p>
    </section>
    <section class="metric-list" aria-label="Projected PR list">
      ${program.lifts.map((lift) => metricRow(liftLabel(lift), `${formatKg(settings.maxes[lift])}kg`, program.projections[lift].label)).join("")}
    </section>
    <section class="detail-card">
      <div class="section-heading">
        <span>判断</span>
        <strong>保守的に進める</strong>
      </div>
      <p>予測PRは到達候補です。今日のRPEが高い場合は重量を足さず、次回へ良い反復を残します。</p>
    </section>
  `;
}

function renderMeet() {
  const settings = readSettings();
  const program = generateBuddyProgram(settings);

  app.innerHTML = `
    <section class="hero-panel" aria-labelledby="screen-title">
      <p class="screen-label">MEET</p>
      <h2 id="screen-title" class="screen-title">最終週の試技候補</h2>
      <p class="screen-copy">旧ロジックの最終週MAXチェックを、試技候補の目安として表示します。</p>
    </section>
    <section class="attempt-list" aria-label="Attempt suggestions">
      ${program.lifts.map((lift) => attemptCard(lift, settings, program.projections[lift])).join("")}
    </section>
    <section class="buddy-note">
      <span>Buddy note</span>
      <p>第一は自己主張ではなく入場券。白を取ってから第二、第三を考えます。</p>
    </section>
  `;
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

function renderWeekList(program) {
  return `
    <section class="week-list" aria-label="Generated weekly plan" data-week-list>
      ${program.weeks.map((week) => `
        <article class="week-card" data-week-card="${week.week}">
          <header class="week-header">
            <div>
              <span>Week ${week.week}</span>
              <strong>${escapeText(week.phase.name)}</strong>
            </div>
            <p>${escapeText(week.phase.tone)}</p>
          </header>
          <p class="week-note">${escapeText(week.note)}</p>
          <div class="day-list">
            ${week.days.map((day, index) => renderDayCard(day, index + 1)).join("")}
          </div>
        </article>
      `).join("")}
    </section>
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

function attemptCard(lift, settings, projection) {
  const max = settings.maxes[lift];
  const openerLow = max * 0.9;
  const openerHigh = max * 0.93;
  const secondLow = max * 0.95;
  const secondHigh = max * 0.98;

  return `
    <article class="attempt-card">
      <span>${escapeText(liftLabel(lift))}</span>
      <strong>第三候補 ${escapeText(projection.label)}</strong>
      <p>第一 ${rangeText(openerLow, openerHigh)} / 第二 ${rangeText(secondLow, secondHigh)}</p>
      <small>すべて提案です。第一は確実に白を取る重量を優先。</small>
    </article>
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

function summaryCard(label, value) {
  return `
    <article>
      <span>${escapeText(label)}</span>
      <strong>${escapeText(value)}</strong>
    </article>
  `;
}

function metricRow(label, max, projection) {
  return `
    <article>
      <span>${escapeText(label)}</span>
      <strong>${escapeText(max)}</strong>
      <p>到達候補 ${escapeText(projection)}</p>
    </article>
  `;
}

function rangeText(low, high) {
  const min = Math.round(low / 2.5) * 2.5;
  const max = Math.max(min, Math.round(high / 2.5) * 2.5);
  return `${formatKg(min)}-${formatKg(max)}kg`;
}

navItems.forEach((item) => {
  item.addEventListener("click", () => navigate(item.dataset.view));
});

navigate(readStoredView());
