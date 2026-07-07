import { formatKg, liftLabel, roundToIncrement } from "./buddy-method.js";
import { readJsonStorage, readStorageValue, STORAGE_KEYS, writeJsonStorage, writeStorageValue } from "./storage.js";

const DEFAULT_MEET = { meetName: "", meetDate: "" };
const DEFAULT_ATTEMPTS = { squat: {}, bench: {}, deadlift: {} };
const CHECKS = [
  ["rack", "ラック高"],
  ["gear", "ギア"],
  ["weighIn", "検量"],
  ["warmup", "アップ"],
  ["openers", "第一試技"],
  ["commands", "コール"]
];

let statusText = "";

export function renderMeetCockpit({ settings, program, logs }) {
  const meet = meetSettings();
  const attempts = attemptDraft();
  const checks = checklist();
  const memo = readStorageValue(STORAGE_KEYS.meetMemo, "");
  const done = CHECKS.filter(([id]) => checks[id]).length;

  return `
    <section class="hero-panel" aria-labelledby="screen-title">
      <p class="screen-label">MEET</p>
      <h2 id="screen-title" class="screen-title">大会当日のコックピット</h2>
      <p class="screen-copy">大会日、D-day、試技ドラフト、チェックリスト、メモを保存します。第一は白判定を最優先。</p>
    </section>
    <section class="program-summary" aria-label="Meet summary">
      <div><span>大会</span><strong>${esc(meet.meetName || "未設定")}</strong></div>
      <div><span>日付</span><strong>${esc(meet.meetDate || "未設定")}</strong></div>
      <div><span>D-day</span><strong>${esc(dDay(meet.meetDate))}</strong></div>
    </section>
    <section class="settings-panel" aria-label="Meet settings">
      <form class="settings-form" data-meet-settings>
        <label><span>大会名</span><input name="meetName" type="text" maxlength="60" value="${attr(meet.meetName)}" /></label>
        <label><span>大会日</span><input name="meetDate" type="date" value="${attr(meet.meetDate)}" /></label>
        <button class="primary-action" type="submit">大会設定を保存</button>
        <p class="form-note">${esc(statusText || "この端末に保存されます。")}</p>
      </form>
    </section>
    <section class="attempt-list" aria-label="Attempt draft">
      ${program.lifts.map((lift) => attemptCard(lift, settings, program, logs, attempts[lift])).join("")}
    </section>
    <section class="detail-card" aria-label="Meet checklist">
      <div class="section-heading"><span>チェックリスト</span><strong>${done} / ${CHECKS.length}</strong></div>
      <div class="settings-form" data-meet-checks>
        ${CHECKS.map(([id, label]) => `<label><span>${esc(label)}</span><select name="${attr(id)}"><option value="false" ${checks[id] ? "" : "selected"}>未確認</option><option value="true" ${checks[id] ? "selected" : ""}>確認済み</option></select></label>`).join("")}
      </div>
    </section>
    <section class="settings-panel" aria-label="Meet memo">
      <div class="settings-form">
        <label class="meet-memo-field"><span>大会メモ</span><textarea data-meet-memo rows="5" maxlength="600">${esc(memo)}</textarea></label>
        <p class="form-note">検量、アップ、ラック高、セコンド共有事項を短く残します。</p>
      </div>
    </section>
    <section class="buddy-note"><span>Buddy note</span><p>第一は自己主張ではなく入場券。白を取ってから勝負。</p></section>
  `;
}

export function bindMeetCockpit(app, { onRefresh }) {
  const settingsForm = app.querySelector("[data-meet-settings]");
  settingsForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    writeJsonStorage(STORAGE_KEYS.meetSettings, meetFromForm(settingsForm));
    statusText = "大会設定を保存しました。";
    onRefresh();
  });
  settingsForm?.addEventListener("change", () => {
    writeJsonStorage(STORAGE_KEYS.meetSettings, meetFromForm(settingsForm));
    statusText = "大会設定を保存しました。";
    onRefresh();
  });

  app.querySelectorAll("[data-attempt-form]").forEach((form) => {
    form.addEventListener("input", () => {
      const attempts = attemptDraft();
      attempts[form.dataset.attemptForm] = attemptFromForm(form);
      writeJsonStorage(STORAGE_KEYS.meetAttemptDraft, attempts);
    });
  });

  const checks = app.querySelector("[data-meet-checks]");
  checks?.addEventListener("change", () => {
    writeJsonStorage(STORAGE_KEYS.meetChecklist, checksFromForm(checks));
    statusText = "チェックリストを保存しました。";
    onRefresh();
  });

  const memo = app.querySelector("[data-meet-memo]");
  memo?.addEventListener("input", () => writeStorageValue(STORAGE_KEYS.meetMemo, memo.value.slice(0, 600)));
}

function attemptCard(lift, settings, program, logs, draft) {
  const suggestion = suggest(lift, settings, program, logs);
  const values = normalizeAttempt(draft);
  return `
    <article class="attempt-card">
      <span>${esc(liftLabel(lift))}</span>
      <strong>候補 ${esc(suggestion.opener)} / ${esc(suggestion.second)} / ${esc(suggestion.third)}</strong>
      <p>${esc(suggestion.basis)}</p>
      <form class="settings-form" data-attempt-form="${attr(lift)}">
        ${attemptInput("opener", "第一", attemptValue(values, "opener", suggestion.opener))}
        ${attemptInput("second", "第二", attemptValue(values, "second", suggestion.second))}
        ${attemptInput("third", "第三", attemptValue(values, "third", suggestion.third))}
      </form>
      <small>ドラフトです。当日の検量、アップ、第一成功後の反応で調整してください。</small>
    </article>
  `;
}

function attemptInput(name, label, value) {
  return `<label><span>${esc(label)}</span><input name="${attr(name)}" type="text" inputmode="decimal" value="${attr(value)}" /></label>`;
}

function attemptValue(values, field, fallback) {
  return values.savedFields[field] ? values[field] : fallback;
}

function suggest(lift, settings, program, logs) {
  const log = [...(logs || [])].find((item) => item.lift === lift && item.workType !== "accessory" && Number(item.e1rm || 0) > 0 && Number(item.rpe || 0) <= 9);
  const max = Number(settings.maxes?.[lift] || 0);
  const base = Number(log?.e1rm || max);
  if (!base) return { opener: "未設定", second: "未設定", third: program.projections?.[lift]?.label || "未設定", basis: "現在1RMまたはLOGを入力してください。" };

  const second = round(base * 0.955);
  const thirdCap = program.projections?.[lift]?.high || base * 1.025;
  const third = round(Math.max(second, Math.min(thirdCap, base * 1.025)));
  return {
    opener: `${formatKg(round(base * 0.9))}kg`,
    second: `${formatKg(second)}kg`,
    third: `${formatKg(third)}kg`,
    basis: log ? `直近LOG e1RM ${formatKg(log.e1rm)}kg基準。` : `現在1RM ${formatKg(max)}kg基準。`
  };
}

function round(value) {
  return roundToIncrement(Math.max(0, Number(value || 0)), 2.5);
}

function meetSettings() {
  const value = readJsonStorage(STORAGE_KEYS.meetSettings, DEFAULT_MEET);
  return { meetName: String(value.meetName || "").slice(0, 60), meetDate: isDate(value.meetDate) ? value.meetDate : "" };
}

function meetFromForm(form) {
  const data = new FormData(form);
  const meetDate = String(data.get("meetDate") || "");
  return { meetName: String(data.get("meetName") || "").slice(0, 60), meetDate: isDate(meetDate) ? meetDate : "" };
}

function attemptDraft() {
  const value = readJsonStorage(STORAGE_KEYS.meetAttemptDraft, DEFAULT_ATTEMPTS);
  return { squat: normalizeAttempt(value.squat), bench: normalizeAttempt(value.bench), deadlift: normalizeAttempt(value.deadlift) };
}

function normalizeAttempt(value) {
  if (typeof value === "string") {
    return {
      opener: value.slice(0, 20),
      second: "",
      third: "",
      savedFields: { opener: true, second: false, third: false }
    };
  }

  return {
    opener: String(value?.opener || "").slice(0, 20),
    second: String(value?.second || "").slice(0, 20),
    third: String(value?.third || "").slice(0, 20),
    savedFields: {
      opener: hasOwn(value, "opener"),
      second: hasOwn(value, "second"),
      third: hasOwn(value, "third")
    }
  };
}

function hasOwn(value, key) {
  return Boolean(value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, key));
}

function attemptFromForm(form) {
  const data = new FormData(form);
  return { opener: String(data.get("opener") || "").slice(0, 20), second: String(data.get("second") || "").slice(0, 20), third: String(data.get("third") || "").slice(0, 20) };
}

function checklist() {
  const value = readJsonStorage(STORAGE_KEYS.meetChecklist, {});
  return Object.fromEntries(CHECKS.map(([id]) => [id, Boolean(value[id])]));
}

function checksFromForm(form) {
  const data = new FormData(form);
  return Object.fromEntries(CHECKS.map(([id]) => [id, data.get(id) === "true"]));
}

function dDay(meetDate) {
  if (!isDate(meetDate)) return "未設定";
  const diff = Math.round((dateOnly(meetDate) - dateOnly(today())) / 86400000);
  if (diff === 0) return "本日";
  return diff > 0 ? `D-${diff}` : `${Math.abs(diff)}日経過`;
}

function dateOnly(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function esc(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function attr(value) {
  return esc(value).replace(/"/g, "&quot;");
}
