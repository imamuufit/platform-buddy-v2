import { LIFTS, formatKg, generateBuddyProgram, liftLabel } from "./buddy-method.js";
import { readArrayStorage, readJsonStorage, STORAGE_KEYS, writeJsonStorage } from "./storage.js";

const LOG_VERSION = 1;

export const FORM_QUALITY_LABELS = {
  steady: "安定",
  ok: "普通",
  rough: "乱れた"
};

export const FATIGUE_LABELS = {
  low: "軽い",
  normal: "普通",
  high: "重い"
};

export const WORK_TYPE_LABELS = {
  top: "トップセット",
  backoff: "バックオフ",
  accessory: "補助"
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
      <h2 id="screen-title" class="screen-title">今日の予定をすぐ残す</h2>
      <p class="screen-copy">HOMEから送ったWeek / Dayを受け取り、トップセットとバックオフを分けて保存します。</p>
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
  const submitLabel = selection.workType === "backoff"
    ? "バックオフも追加保存"
    : selection.workType === "top"
      ? "トップセットを保存"
      : "LOGを保存";

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
          <p>${escapeText(selection.segment.title)} / 予定RPE ${escapeText(selection.segment.rpe || "-")}</p>
          ${selection.segment.note ? `<p>${escapeText(selection.segment.note)}</p>` : ""}
        </div>

        ${renderWorkTypeControls(selection)}

        <div class="log-input-grid">
          ${numberField("weight", "重量 kg", values.weight, "decimal", "2.5", true)}
          ${numberField("reps", "レップ数", values.reps, "numeric", "1", true)}
          ${numberField("sets", "セット数", values.sets, "numeric", "1", true)}
          ${numberField("rpe", "RPE", values.rpe, "decimal", "0.5", true)}
          ${numberField("rir", "RIR", values.rir, "decimal", "0.5", false)}
        </div>

        <div class="quick-choice-grid">
          ${choiceField("formQuality", "フォーム再現性", FORM_QUALITY_LABELS, values.formQuality)}
          ${choiceField("fatigue", "疲労感", FATIGUE_LABELS, values.fatigue)}
        </div>

        <label class="log-memo-field">
          <span>メモ</span>
          <textarea name="memo" rows="3" maxlength="220" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="痛み、迷い、良かった反復だけ短く">${escapeText(values.memo)}</textarea>
        </label>

        <div class="log-preview" data-log-preview>${previewMarkup(values)}</div>
        <button class="primary-action" type="submit">${escapeText(submitLabel)}</button>
        <p class="form-note" data-log-status>${escapeText(statusMessage || "保存後もこの端末のlocalStorageに残ります。")}</p>
      </form>
    </section>
  `;
}

function renderWorkTypeControls(selection) {
  const controls = selection.segments.map((segment) => `
    <button class="choice-button ${segment.workType === selection.workType ? "is-selected" : ""}" type="button" data-work-type="${escapeAttribute(segment.workType)}">
      <span>${escapeText(workTypeLabel(segment.workType))}</span>
      <strong>${escapeText(segment.shortTitle || segment.title)}</strong>
    </button>
  `).join("");

  return `
    <div class="work-type-field" aria-label="記録するセット種別">
      <span>記録する内容</span>
      <input type="hidden" name="workType" value="${escapeAttribute(selection.workType)}" />
      <div class="work-type-toggle">${controls}</div>
    </div>
  `;
}

function choiceField(name, label, labels, currentValue) {
  return `
    <fieldset class="quick-choice-field">
      <legend>${escapeText(label)}</legend>
      <input type="hidden" name="${escapeAttribute(name)}" value="${escapeAttribute(currentValue)}" />
      <div class="choice-row">
        ${Object.entries(labels).map(([value, display]) => `
          <button class="choice-button ${value === currentValue ? "is-selected" : ""}" type="button" data-choice-field="${escapeAttribute(name)}" data-choice-value="${escapeAttribute(value)}">
            ${escapeText(display)}
          </button>
        `).join("")}
      </div>
    </fieldset>
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
        <p>最初の1本を保存すると、HOMEの次回予定とDATAの判断に反映されます。</p>
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
          <span>${escapeText(log.date)} / Week ${escapeText(log.plan.week)} Day ${escapeText(log.plan.day)} / ${escapeText(workTypeLabel(log.workType))}</span>
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

  form.querySelectorAll("[data-work-type]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextDraft = {
        ...draftFromForm(form),
        workType: String(button.dataset.workType || "top"),
        weight: "",
        reps: "",
        sets: "",
        rpe: ""
      };
      statusMessage = "";
      writeJsonStorage(STORAGE_KEYS.logDraft, nextDraft);
      renderTrainingLog({ app, settings: program.settings });
    });
  });

  form.querySelectorAll("[data-choice-field]").forEach((button) => {
    button.addEventListener("click", () => {
      const field = String(button.dataset.choiceField || "");
      const value = String(button.dataset.choiceValue || "");
      const input = form.querySelector(`input[name="${field}"]`);
      if (!input) return;

      input.value = value;
      form.querySelectorAll(`[data-choice-field="${field}"]`).forEach((item) => {
        item.classList.toggle("is-selected", item === button);
      });
      writeJsonStorage(STORAGE_KEYS.logDraft, draftFromForm(form));
      updatePreview(form);
    });
  });

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
    const nextDraft = nextDraftAfterSave(form, result.selection);
    writeJsonStorage(STORAGE_KEYS.logDraft, nextDraft);
    statusMessage = result.entry.workType === "top" && hasBackoffSegment(result.selection)
      ? "トップセットを保存しました。必要ならバックオフもこのまま追加保存できます。"
      : `${result.entry.date} ${liftLabel(result.entry.lift)} を保存しました。`;
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

export function readLogs() {
  return readArrayStorage(STORAGE_KEYS.trainingLogs, [])
    .map(normalizeLog)
    .filter(Boolean)
    .sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`));
}

export function saveLogs(logs) {
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
    workType: normalizeLogWorkType(entry.workType, entry.itemLabel),
    weight,
    reps,
    sets,
    rpe,
    rir: optionalNumber(entry.rir),
    e1rm: optionalNumber(entry.e1rm) || estimateE1rm(weight, reps),
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
    workType: normalizeWorkType(stored.workType),
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
  const item = items[itemIndex] || fallbackItem(program);
  const segments = workSegmentsForItem(item);
  const workType = normalizeWorkType(draft.workType, segments);
  const segment = segments.find((part) => part.workType === workType) || segments[0];

  return { week, day, dayNumber, items, itemIndex, item, segments, workType: segment.workType, segment };
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

export function workSegmentsForItem(item) {
  const title = String(item?.prescription?.title || item?.work || item?.label || "PLANを確認");
  const note = String(item?.prescription?.note || item?.note || "");

  if (!item || item.type !== "main") {
    return [{
      workType: "accessory",
      label: workTypeLabel("accessory"),
      title,
      shortTitle: title,
      percent: "-",
      sets: item?.prescription?.sets || "",
      reps: item?.prescription?.reps || "",
      rpe: item?.prescription?.rpe || "6以下",
      note
    }];
  }

  const [topPart, backoffPart] = title.split(/\s*\/\s*Backoff\s*/i);
  const topReps = firstSplitValue(item.prescription?.reps, 0) || repsFromTitle(topPart);
  const topSegment = {
    workType: "top",
    label: workTypeLabel("top"),
    title: topPart.trim() || title,
    shortTitle: topPart.trim() || title,
    percent: item.prescription?.percent || "-",
    sets: "1",
    reps: topReps || firstNumber(item.prescription?.reps),
    rpe: firstSplitValue(item.prescription?.rpe, 0) || item.prescription?.rpe || "",
    note
  };

  if (!backoffPart) {
    return [{
      ...topSegment,
      label: item.variant === "main" ? workTypeLabel("top") : "メインセット",
      sets: item.prescription?.sets || topSegment.sets,
      reps: item.prescription?.reps || topSegment.reps
    }];
  }

  const backoffTitle = backoffPart.trim();
  const backoffSegment = {
    workType: "backoff",
    label: workTypeLabel("backoff"),
    title: backoffTitle,
    shortTitle: backoffTitle,
    percent: "Backoff",
    sets: setsFromTitle(backoffTitle) || firstSplitValue(item.prescription?.sets, 1) || firstNumber(item.prescription?.sets),
    reps: repsFromTitle(backoffTitle) || firstSplitValue(item.prescription?.reps, 1) || firstNumber(item.prescription?.reps),
    rpe: item.prescription?.rpe || "",
    note: "トップセット後の反復。フォームが崩れる前に止める。"
  };

  return [topSegment, backoffSegment];
}

function formValues(draft, selection) {
  const suggested = suggestedValuesForSegment(selection.segment);
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

export function suggestedValuesForSegment(segment) {
  return {
    weight: firstKg(segment?.title),
    reps: repsFromTitle(segment?.title) || firstNumber(segment?.reps),
    sets: setsFromTitle(segment?.title) || firstNumber(segment?.sets),
    rpe: firstNumber(segment?.rpe)
  };
}

function draftFromForm(form) {
  const data = new FormData(form);
  return {
    date: String(data.get("date") || today()),
    week: Number(data.get("week") || 1),
    day: Number(data.get("day") || 1),
    itemIndex: Number(data.get("itemIndex") || 0),
    workType: String(data.get("workType") || "top"),
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
    selection,
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
      itemLabel: `${selection.item.logLabel} / ${workTypeLabel(selection.segment.workType)}`,
      prescription: selection.segment.title,
      workType: selection.segment.workType,
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
  const itemIndex = clampInteger(raw.itemIndex, 0, Math.max(0, items.length - 1), 0);
  const segments = workSegmentsForItem(items[itemIndex] || fallbackItem(program));

  return {
    ...raw,
    date: validDate(raw.date) ? raw.date : today(),
    week,
    day,
    itemIndex,
    workType: normalizeWorkType(raw.workType, segments),
    formQuality: FORM_QUALITY_LABELS[raw.formQuality] ? raw.formQuality : "steady",
    fatigue: FATIGUE_LABELS[raw.fatigue] ? raw.fatigue : "normal",
    memo: String(raw.memo || "").slice(0, 220)
  };
}

function nextDraftAfterSave(form, selection) {
  const base = { ...draftFromForm(form), memo: "" };
  if (selection.workType === "top" && hasBackoffSegment(selection)) {
    return {
      ...base,
      workType: "backoff",
      weight: "",
      reps: "",
      sets: "",
      rpe: "",
      rir: ""
    };
  }

  return base;
}

function hasBackoffSegment(selection) {
  return selection.segments.some((segment) => segment.workType === "backoff");
}

function updatePreview(form) {
  const preview = form.querySelector("[data-log-preview]");
  if (preview) preview.innerHTML = previewMarkup(draftFromForm(form));
}

function previewMarkup(values) {
  const e1rm = estimateE1rm(values.weight, values.reps);
  const recommendation = recommendationFromValues(values.rpe, values.formQuality, values.fatigue);
  return `
    <div>
      <span>e1RM preview</span>
      <strong>${escapeText(e1rm ? `${formatKg(e1rm)}kg` : "重量と1-12回を入力")}</strong>
    </div>
    <p>${escapeText(recommendation.note)}</p>
  `;
}

export function recommendationForLog(log) {
  if (!log) {
    return {
      label: "LOG待ち",
      tone: "hold",
      note: "まず今日のトップセットを保存すると次回判断が出ます。"
    };
  }

  return recommendationFromValues(log.rpe, log.formQuality, log.fatigue);
}

function recommendationFromValues(rpeValue, formQuality, fatigue) {
  const rpe = positiveNumber(rpeValue);
  if (!rpe) {
    return {
      label: "LOG待ち",
      tone: "hold",
      note: "RPEを入れると次回調整の目安が出ます。"
    };
  }

  if (rpe >= 9 || formQuality === "rough" || fatigue === "high") {
    return {
      label: "維持または-2.5kg候補",
      tone: "down",
      note: "RPE、フォーム、疲労のどれかが重い日です。次回は足さず、白判定の形を優先。"
    };
  }

  if (rpe <= 7 && formQuality === "steady" && fatigue === "low") {
    return {
      label: "+2.5kg候補",
      tone: "up",
      note: "余裕あり。次回は+2.5kg候補。ただし予定RPEを超えない範囲で。"
    };
  }

  return {
    label: "維持候補",
    tone: "hold",
    note: "予定通り。次回も同じフォーム再現性を優先。"
  };
}

export function nextTrainingFromLogs(program, logs) {
  const fallback = trainingAt(program, 1, 1);
  const normalizedLogs = (logs || []).map(normalizeLog).filter(Boolean);
  const compatibleLogs = normalizedLogs.filter((log) => isCompatibleProgramLog(log, program.settings));
  const lastLog = latestLog(compatibleLogs.length ? compatibleLogs : normalizedLogs);
  if (!lastLog?.plan?.week || !lastLog?.plan?.day) return fallback;

  const lastWeek = Number(lastLog.plan.week);
  const lastDay = Number(lastLog.plan.day);
  const week = program.weeks[lastWeek - 1];
  if (!week) return fallback;

  if (lastDay < week.days.length) return trainingAt(program, lastWeek, lastDay + 1);
  if (lastWeek < program.weeks.length) return trainingAt(program, lastWeek + 1, 1);

  return {
    ...trainingAt(program, lastWeek, lastDay),
    isComplete: true
  };
}

function trainingAt(program, weekNumber, dayNumber) {
  const week = program.weeks[weekNumber - 1] || program.weeks[0];
  const day = week?.days[dayNumber - 1] || week?.days[0];
  const mainIndex = Math.max(0, day?.items?.findIndex((item) => item.type === "main") ?? 0);
  const mainItem = day?.items?.[mainIndex] || day?.items?.[0];

  return {
    week: week?.week || 1,
    day: dayNumber,
    dayTitle: day?.title || "PLAN未生成",
    phase: week?.phase?.name || "",
    weekNote: week?.note || "",
    itemIndex: mainIndex,
    mainItem,
    dayItems: day?.items || []
  };
}

function isCompatibleProgramLog(log, settings) {
  if (!log?.plan) return false;
  const targetMatches = !log.plan.target || log.plan.target === settings.target;
  const lengthMatches = !log.plan.length || Number(log.plan.length) === Number(settings.length);
  const frequencyMatches = !log.plan.daysPerWeek || Number(log.plan.daysPerWeek) === Number(settings.daysPerWeek);
  return targetMatches && lengthMatches && frequencyMatches;
}

export function latestLog(logs) {
  return [...(logs || [])]
    .map(normalizeLog)
    .filter(Boolean)
    .sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`))[0];
}

export function workTypeLabel(value) {
  return WORK_TYPE_LABELS[value] || WORK_TYPE_LABELS.top;
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

export function estimateE1rm(weightValue, repsValue) {
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

function firstSplitValue(value, index) {
  const parts = String(value ?? "").split(/\s*(?:\/|\+)\s*/).map((item) => item.trim()).filter(Boolean);
  return cleanNumber(parts[index] || "");
}

function repsFromTitle(value) {
  const match = String(value ?? "").match(/x\s*(\d+(?:\.\d+)?)\s*回/);
  return match ? cleanNumber(match[1]) : "";
}

function setsFromTitle(value) {
  const match = String(value ?? "").match(/x\s*\d+(?:\.\d+)?\s*回\s*x\s*(\d+(?:\.\d+)?)\s*set/i);
  return match ? cleanNumber(match[1]) : "";
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

function normalizeWorkType(value, segments = []) {
  const candidate = String(value || "top");
  const allowed = segments.length ? segments.map((segment) => segment.workType) : Object.keys(WORK_TYPE_LABELS);
  return allowed.includes(candidate) ? candidate : allowed[0] || "top";
}

function normalizeLogWorkType(value, itemLabel = "") {
  const candidate = String(value || "");
  if (Object.prototype.hasOwnProperty.call(WORK_TYPE_LABELS, candidate)) return candidate;
  return String(itemLabel || "").startsWith("補助") ? "accessory" : "top";
}
