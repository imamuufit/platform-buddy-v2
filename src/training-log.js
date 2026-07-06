import { LIFTS, formatKg, generateBuddyProgram, liftLabel } from "./buddy-method.js";
import { readArrayStorage, readJsonStorage, STORAGE_KEYS, writeJsonStorage } from "./storage.js";

const LOG_VERSION = 1;

const FORM_QUALITY_LABELS = {
  steady: "安定",
  ok: "普通",
  rough: "乱れた"
};

const FATIGUE_LABELS = {
  low: "軽い",
  normal: "普通",
  high: "重い"
};

let statusMessage = "";

export function renderTrainingLog({ app, settings }) {
  const program = generateBuddyProgram(settings);
  const draft = readDraft(program);
  const selection = selectedWork(program, draft);
  const logs = readLogs();

  app.innerHTML = `
    <section class="hero-panel" aria-labelledby="screen-title">
      <p class="screen-label">LOG</p>
      <h2 id="screen-title" class="screen-title">PLANにつなぐ実施LOG</h2>
      <p class="screen-copy">Buddy MethodのWeek / Dayを選び、実施したメインセットをこの端末に保存します。</p>
    </section>
    ${renderLogForm(program, draft, selection)}
    ${renderRecentLogs(logs)}
  `;

  bindForm(app, program);
  bindDeleteButtons(app, logs, settings);
}

function renderLogForm(program, draft, selection) {
  const values = formValues(draft, selection);
  const week = program.weeks[draft.week - 1] || program.weeks[0];
  const day = week?.days[draft.day - 1] || week?.days[0];

  return `
    <section class="settings-panel log-panel" aria-label="Training log form">
      <form class="settings-form log-form" data-log-form>
        <label>
          <span>実施日</span>
          <input name="date" type="date" value="${escapeAttribute(values.date)}" />
        </label>

        <label>
          <span>対象プラン</span>
          <select name="week" data-log-rerender>
            ${program.weeks.map((item) => option(item.week, `Week ${item.week} / ${item.phase.name}`, draft.week)).join("")}
          </select>
        </label>

        <label>
          <span>Day</span>
          <select name="day" data-log-rerender>
            ${(week?.days || []).map((item, index) => option(index + 1, `Day ${index + 1} / ${item.title}`, draft.day)).join("")}
          </select>
        </label>

        <label>
          <span>種目</span>
          <select name="itemIndex" data-log-rerender>
            ${selection.items.map((item, index) => option(index, item.logLabel, selection.itemIndex)).join("")}
          </select>
        </label>

        <div class="log-prescription">
          <span>${escapeText(program.summary.targetLabel)} / ${escapeText(program.summary.lengthLabel)} / ${escapeText(program.summary.frequencyLabel)}</span>
          <strong>${escapeText(day?.title || "Day未選択")} - ${escapeText(selection.item.logLabel)}</strong>
          <p>${escapeText(selection.item.prescription.title)} / 予定RPE ${escapeText(selection.item.prescription.rpe || "-")}</p>
        </div>

        <div class="log-input-grid">
          ${numberField("weight", "重量 kg", values.weight, "decimal", "2.5", true)}
          ${numberField("reps", "レップ数", values.reps, "numeric", "1", true)}
          ${numberField("sets", "セット数", values.sets, "numeric", "1", true)}
          ${numberField("rpe", "RPE", values.rpe, "decimal", "0.5", true)}
          ${numberField("rir", "RIR", values.rir, "decimal", "0.5", false)}
          <label>
            <span>フォーム再現性</span>
            <select name="formQuality">
              ${option("steady", FORM_QUALITY_LABELS.steady, values.formQuality)}
              ${option("ok", FORM_QUALITY_LABELS.ok, values.formQuality)}
              ${option("rough", FORM_QUALITY_LABELS.rough, values.formQuality)}
            </select>
          </label>
          <label>
            <span>疲労感</span>
            <select name="fatigue">
              ${option("low", FATIGUE_LABELS.low, values.fatigue)}
              ${option("normal", FATIGUE_LABELS.normal, values.fatigue)}
              ${option("high", FATIGUE_LABELS.high, values.fatigue)}
            </select>
          </label>
        </div>

        <label class="log-memo-field">
          <span>メモ</span>
          <textarea name="memo" rows="3" maxlength="220" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="痛み、迷い、良かった反復だけ短く">${escapeText(values.memo)}</textarea>
        </label>

        <div class="log-preview" data-log-preview>${previewMarkup(values)}</div>
        <button class="primary-action" type="submit">LOGを保存</button>
        <p class="form-note" data-log-status>${escapeText(statusMessage || "保存後もこの端末のlocalStorageに残ります。")}</p>
      </form>
    </section>
  `;
}

function renderRecentLogs(logs) {
  if (!logs.length) {
    return `
      <section class="detail-card" aria-label="Recent logs">
        <div class="section-heading">
          <span>最近のLOG</span>
          <strong>まだ保存なし</strong>
        </div>
        <p>最初の1本を保存すると、ここに直近の実施記録が並びます。</p>
      </section>
    `;
  }

  return `
    <section class="log-list" aria-label="Recent saved logs">
      ${logs.slice(0, 8).map(renderLogCard).join("")}
    </section>
  `;
}

function renderLogCard(log) {
  const e1rmText = log.e1rm ? `${formatKg(log.e1rm)}kg` : "-";
  return `
    <article class="log-card">
      <header>
        <div>
          <span>${escapeText(log.date)} / Week ${escapeText(log.plan.week)} Day ${escapeText(log.plan.day)}</span>
          <strong>${escapeText(liftLabel(log.lift))} ${formatKg(log.weight)}kg x ${escapeText(log.reps)} x ${escapeText(log.sets)}set</strong>
        </div>
        <button class="text-action" type="button" data-delete-log="${escapeAttribute(log.id)}">削除</button>
      </header>
      <dl>
        <div><dt>RPE</dt><dd>${escapeText(log.rpe)}</dd></div>
        <div><dt>RIR</dt><dd>${escapeText(log.rir === "" ? "-" : log.rir)}</dd></div>
        <div><dt>e1RM</dt><dd>${escapeText(e1rmText)}</dd></div>
        <div><dt>疲労</dt><dd>${escapeText(FATIGUE_LABELS[log.fatigue] || log.fatigue)}</dd></div>
      </dl>
      <p>${escapeText(log.plan.dayTitle)} / ${escapeText(FORM_QUALITY_LABELS[log.formQuality] || log.formQuality)}</p>
      ${log.memo ? `<p class="log-memo">${escapeText(log.memo)}</p>` : ""}
    </article>
  `;
}

function bindForm(app, program) {
  const form = app.querySelector("[data-log-form]");
  if (!form) return;

  form.addEventListener("input", () => {
    writeJsonStorage(STORAGE_KEYS.logDraft, draftFromForm(form));
    updatePreview(form);
  });

  form.addEventListener("change", (event) => {
    writeJsonStorage(STORAGE_KEYS.logDraft, draftFromForm(form));
    if (event.target?.hasAttribute("data-log-rerender")) {
      statusMessage = "";
      renderTrainingLog({ app, settings: program.settings });
      return;
    }
    updatePreview(form);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = entryFromForm(form, program);
    if (result.error) {
      setStatus(form, result.error, true);
      return;
    }

    saveLogs([result.entry, ...readLogs()]);
    writeJsonStorage(STORAGE_KEYS.logDraft, { ...draftFromForm(form), memo: "" });
    statusMessage = `${result.entry.date} ${liftLabel(result.entry.lift)} を保存しました。`;
    renderTrainingLog({ app, settings: program.settings });
  });

  updatePreview(form);
}

function bindDeleteButtons(app, logs, settings) {
  app.querySelectorAll("[data-delete-log]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-delete-log");
      const log = logs.find((item) => item.id === id);
      if (!log) return;

      const confirmed = window.confirm(`${log.date} ${liftLabel(log.lift)} ${formatKg(log.weight)}kg のLOGを削除しますか？`);
      if (!confirmed) return;

      saveLogs(logs.filter((item) => item.id !== id));
      statusMessage = "LOGを1件削除しました。";
      renderTrainingLog({ app, settings });
    });
  });
}

function readLogs() {
  return readArrayStorage(STORAGE_KEYS.trainingLogs, [])
    .map(normalizeLog)
    .filter(Boolean)
    .sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`));
}

function saveLogs(logs) {
  writeJsonStorage(STORAGE_KEYS.trainingLogs, logs);
}

function normalizeLog(entry) {
  if (!entry || typeof entry !== "object") return null;
  const lift = Object.prototype.hasOwnProperty.call(LIFTS, entry.lift) ? entry.lift : "bench";
  const weight = positiveNumber(entry.weight);
  const reps = positiveNumber(entry.reps);
  const sets = positiveNumber(entry.sets);
  const rpe = positiveNumber(entry.rpe);
  if (!weight || !reps || !sets || !rpe) return null;

  return {
    version: Number(entry.version || LOG_VERSION),
    id: String(entry.id || `legacy-${entry.createdAt || entry.date || Date.now()}`),
    createdAt: String(entry.createdAt || ""),
    date: validDate(entry.date) ? entry.date : today(),
    plan: {
      target: String(entry.plan?.target || ""),
      length: Number(entry.plan?.length || 0),
      daysPerWeek: Number(entry.plan?.daysPerWeek || 0),
      week: Number(entry.plan?.week || 1),
      day: Number(entry.plan?.day || 1),
      dayTitle: String(entry.plan?.dayTitle || ""),
      phase: String(entry.plan?.phase || "")
    },
    lift,
    itemLabel: String(entry.itemLabel || liftLabel(lift)),
    prescription: String(entry.prescription || ""),
    weight,
    reps,
    sets,
    rpe,
    rir: optionalNumber(entry.rir),
    e1rm: optionalNumber(entry.e1rm),
    formQuality: FORM_QUALITY_LABELS[entry.formQuality] ? entry.formQuality : "ok",
    fatigue: FATIGUE_LABELS[entry.fatigue] ? entry.fatigue : "normal",
    memo: String(entry.memo || "").slice(0, 220)
  };
}

function readDraft(program) {
  const stored = readJsonStorage(STORAGE_KEYS.logDraft, {});
  const week = clampInteger(stored.week, 1, program.weeks.length, 1);
  const days = program.weeks[week - 1]?.days || [];
  const day = clampInteger(stored.day, 1, Math.max(1, days.length), 1);
  const itemCount = logItemsForDay(days[day - 1], program).length;

  return {
    date: validDate(stored.date) ? stored.date : today(),
    week,
    day,
    itemIndex: clampInteger(stored.itemIndex, 0, Math.max(0, itemCount - 1), 0),
    weight: cleanDraft(stored.weight),
    reps: cleanDraft(stored.reps),
    sets: cleanDraft(stored.sets),
    rpe: cleanDraft(stored.rpe),
    rir: cleanDraft(stored.rir),
    formQuality: FORM_QUALITY_LABELS[stored.formQuality] ? stored.formQuality : "steady",
    fatigue: FATIGUE_LABELS[stored.fatigue] ? stored.fatigue : "normal",
    memo: String(stored.memo || "").slice(0, 220)
  };
}

function selectedWork(program, draft) {
  const week = program.weeks[draft.week - 1] || program.weeks[0];
  const dayNumber = clampInteger(draft.day, 1, week?.days.length || 1, 1);
  const day = week?.days[dayNumber - 1] || week?.days[0];
  const items = logItemsForDay(day, program);
  const itemIndex = clampInteger(draft.itemIndex, 0, Math.max(0, items.length - 1), 0);

  return { week, day, dayNumber, items, itemIndex, item: items[itemIndex] || fallbackItem(program) };
}

function logItemsForDay(day, program) {
  if (!day?.items?.length) return [fallbackItem(program)];

  return day.items.map((item) => {
    if (item.type === "main") return { ...item, logLabel: item.label, prescription: item.prescription };
    return {
      ...item,
      lift: LIFTS[day.focus] ? day.focus : program.lifts[0],
      logLabel: `補助 ${item.label}`,
      prescription: { title: item.work || item.label, rpe: "6以下", note: item.note || "" }
    };
  });
}

function fallbackItem(program) {
  const lift = program.lifts[0] || "bench";
  return {
    type: "main",
    lift,
    label: liftLabel(lift),
    logLabel: liftLabel(lift),
    prescription: { title: "PLANを確認", rpe: "", note: "" }
  };
}

function formValues(draft, selection) {
  const suggested = suggestedValues(selection.item);
  return {
    date: draft.date || today(),
    weight: valueOrDefault(draft.weight, suggested.weight),
    reps: valueOrDefault(draft.reps, suggested.reps),
    sets: valueOrDefault(draft.sets, suggested.sets),
    rpe: valueOrDefault(draft.rpe, suggested.rpe),
    rir: draft.rir || "",
    formQuality: draft.formQuality || "steady",
    fatigue: draft.fatigue || "normal",
    memo: draft.memo || ""
  };
}

function suggestedValues(item) {
  return {
    weight: firstKg(item.prescription?.title),
    reps: firstNumber(item.prescription?.reps),
    sets: totalNumber(item.prescription?.sets),
    rpe: firstNumber(item.prescription?.rpe)
  };
}

function draftFromForm(form) {
  const data = new FormData(form);
  return {
    date: String(data.get("date") || today()),
    week: Number(data.get("week") || 1),
    day: Number(data.get("day") || 1),
    itemIndex: Number(data.get("itemIndex") || 0),
    weight: String(data.get("weight") || ""),
    reps: String(data.get("reps") || ""),
    sets: String(data.get("sets") || ""),
    rpe: String(data.get("rpe") || ""),
    rir: String(data.get("rir") || ""),
    formQuality: String(data.get("formQuality") || "steady"),
    fatigue: String(data.get("fatigue") || "normal"),
    memo: String(data.get("memo") || "").slice(0, 220)
  };
}

function entryFromForm(form, program) {
  const raw = draftFromForm(form);
  const draft = readDraftFromForm(raw, program);
  const selection = selectedWork(program, draft);
  const weight = positiveNumber(draft.weight);
  const reps = positiveNumber(draft.reps);
  const sets = positiveNumber(draft.sets);
  const rpe = positiveNumber(draft.rpe);

  if (!weight || !reps || !sets || !rpe) return { error: "重量、レップ数、セット数、RPEを入力してください。" };

  return {
    entry: {
      version: LOG_VERSION,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      date: draft.date,
      plan: {
        target: program.settings.target,
        length: program.settings.length,
        daysPerWeek: program.settings.daysPerWeek,
        week: draft.week,
        day: draft.day,
        dayTitle: selection.day?.title || "",
        phase: selection.week?.phase?.name || ""
      },
      lift: selection.item.lift,
      itemLabel: selection.item.logLabel,
      prescription: selection.item.prescription.title,
      weight,
      reps,
      sets,
      rpe,
      rir: optionalNumber(draft.rir),
      e1rm: estimateE1rm(weight, reps),
      formQuality: draft.formQuality,
      fatigue: draft.fatigue,
      memo: draft.memo
    }
  };
}

function readDraftFromForm(raw, program) {
  const week = clampInteger(raw.week, 1, program.weeks.length, 1);
  const day = clampInteger(raw.day, 1, program.weeks[week - 1]?.days.length || 1, 1);
  const items = logItemsForDay(program.weeks[week - 1]?.days[day - 1], program);

  return {
    ...raw,
    date: validDate(raw.date) ? raw.date : today(),
    week,
    day,
    itemIndex: clampInteger(raw.itemIndex, 0, Math.max(0, items.length - 1), 0),
    formQuality: FORM_QUALITY_LABELS[raw.formQuality] ? raw.formQuality : "steady",
    fatigue: FATIGUE_LABELS[raw.fatigue] ? raw.fatigue : "normal",
    memo: String(raw.memo || "").slice(0, 220)
  };
}

function updatePreview(form) {
  const preview = form.querySelector("[data-log-preview]");
  if (preview) preview.innerHTML = previewMarkup(draftFromForm(form));
}

function previewMarkup(values) {
  const e1rm = estimateE1rm(values.weight, values.reps);
  const guidance = rpeGuidance(values.rpe, values.formQuality, values.fatigue);
  return `
    <div>
      <span>e1RM preview</span>
      <strong>${escapeText(e1rm ? `${formatKg(e1rm)}kg` : "重量と1-12回を入力")}</strong>
    </div>
    <p>${escapeText(guidance)}</p>
  `;
}

function rpeGuidance(rpeValue, formQuality, fatigue) {
  const rpe = positiveNumber(rpeValue);
  if (!rpe) return "RPEを入れると次回調整の目安が出ます。";
  if (rpe >= 9 || formQuality === "rough" || fatigue === "high") return "次回は維持か-2.5kg候補。フォームを崩してまで足さない。";
  if (rpe <= 7 && formQuality === "steady" && fatigue === "low") return "余裕あり。次回+2.5kg候補。ただし予定RPEを超えない。";
  return "予定通り。次回も同じフォーム再現性を優先。";
}

function numberField(name, label, value, inputmode, step, required) {
  return `
    <label>
      <span>${escapeText(label)}</span>
      <input name="${name}" type="number" inputmode="${inputmode}" min="${name === "rpe" ? "1" : "0"}" step="${step}" value="${escapeAttribute(value)}" ${required ? "required" : ""} />
    </label>
  `;
}

function setStatus(form, message, isError) {
  const status = form.querySelector("[data-log-status]");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

function estimateE1rm(weightValue, repsValue) {
  const weight = positiveNumber(weightValue);
  const reps = positiveNumber(repsValue);
  if (!weight || !reps || reps < 1 || reps > 12) return null;
  return Math.round(weight * (1 + reps / 30) * 2) / 2;
}

function option(value, label, currentValue) {
  return `<option value="${escapeAttribute(value)}" ${String(value) === String(currentValue) ? "selected" : ""}>${escapeText(label)}</option>`;
}

function escapeText(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
  return escapeText(value).replace(/"/g, "&quot;");
}

function firstKg(value) {
  const match = String(value ?? "").match(/([\d,.]+)\s*kg/i);
  return match ? cleanNumber(match[1]) : "";
}

function firstNumber(value) {
  const match = String(value ?? "").match(/\d+(?:\.\d+)?/);
  return match ? cleanNumber(match[0]) : "";
}

function totalNumber(value) {
  const matches = String(value ?? "").match(/\d+(?:\.\d+)?/g);
  if (!matches?.length) return "";
  return cleanNumber(matches.reduce((sum, item) => sum + Number(item), 0));
}

function valueOrDefault(value, fallback) {
  return value === undefined || value === null || value === "" ? fallback : value;
}

function positiveNumber(value) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function optionalNumber(value) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : "";
}

function cleanDraft(value) {
  return value === undefined || value === null ? "" : String(value).slice(0, 20);
}

function cleanNumber(value) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return "";
  return Number.isInteger(parsed) ? String(parsed) : String(parsed);
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function today() {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localTime.toISOString().slice(0, 10);
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
