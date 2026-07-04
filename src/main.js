import { MEET_ATTEMPT_NOTES } from "./meet-attempt-notes.js";
import { readStorageValue, STORAGE_KEYS, writeStorageValue } from "./storage.js";

const screens = {
  home: {
    label: "HOME",
    title: "Bench press focus day",
    copy: "今日はベンチの質を最優先。最初のワークセットを丁寧に決めて、予定はPLANで確認します。",
    action: "Open today's plan",
    status: ["Ready", "Normal fatigue", "No meet set"],
    goal: "Next goal: build toward meet-ready attempts.",
    wellness: [
      ["Sleep", "Neutral"],
      ["Soreness", "Low"],
      ["Stress", "Normal"]
    ],
    meet: "Meet date not set",
    buddy: "Buddy note: Keep the first work set crisp. Adjust only after the top set."
  },
  log: {
    label: "LOG",
    title: "Record the next set",
    copy: "バーを置いたらすぐ残す。入力順はリフト、重量、回数、RPE、保存。メモは後で十分です。",
    fields: [
      ["Lift", "Bench press", "lift"],
      ["Weight", "120 kg", "weight"],
      ["Reps", "5", "reps"],
      ["RPE", "8", "rpe"]
    ],
    action: "Save draft",
    memo: "Memo: draft stays on this device."
  },
  plan: {
    label: "PLAN",
    title: "Today's prescription",
    copy: "設定より先に、今日やる内容を確認します。数値は静的な仮置きで、処方ロジックはまだ追加しません。",
    mainLift: "Bench press",
    topSet: "Top set: 120 kg × 5 @ RPE 8",
    backoff: "Backoff: 105 kg × 5 × 3",
    target: "Target: crisp reps, stable pause",
    cycle: [
      ["Cycle", "Base block"],
      ["Week", "1 / 4"],
      ["Intent", "Accumulate clean volume"]
    ],
    rule: "Adjustment rule: if warm-ups feel heavy, keep the top set conservative.",
    buddy: "Buddy note: Do not negotiate with the bar before the first work set."
  },
  data: {
    label: "DATA",
    title: "Training judgment",
    copy: "グラフを見る前に、次の判断を確認します。ここでは静的な仮置きだけを表示し、計算やチャートはまだ追加しません。",
    judgment: "Hold the load and clean up execution.",
    signals: [
      ["e1RM trend", "Flat"],
      ["RPE drift", "Slightly high"],
      ["Completion", "On track"],
      ["Fatigue", "Manageable"]
    ],
    recommendation: "Next recommendation: repeat the prescription before increasing load.",
    buddy: "Buddy note: A flat trend is not a failure. It is a request for cleaner reps."
  },
  meet: {
    label: "MEET",
    title: "Meet day cockpit",
    copy: "試合の日に迷わないための静的チェック画面です。試技計算や日付ロジックはまだ追加しません。",
    status: "Meet date not set",
    attempts: [
      ["Squat", "Opener not set", "squat"],
      ["Bench", "Opener not set", "bench"],
      ["Deadlift", "Opener not set", "deadlift"]
    ],
    checks: ["Rack height", "Equipment", "Weigh-in", "Warm-up timing"],
    readiness: ["Weigh-in", "Rack heights", "Warm-up plan", "Openers", "Commands"],
    rules: "White lights first: commands, depth, pause, lockout, and control before load selection.",
    buddy: "Buddy note: The first attempt is not a statement. It is an entry ticket."
  }
};

const app = document.querySelector("#app");
const navItems = Array.from(document.querySelectorAll(".nav-item"));
const logDraftDefaults = Object.fromEntries(screens.log.fields.map(([, value, key]) => [key, value]));
const meetAttemptDraftDefaults = Object.fromEntries(screens.meet.attempts.map(([, value, key]) => [key, value]));

function isKnownView(viewName) {
  return Object.prototype.hasOwnProperty.call(screens, viewName);
}

function readStoredView() {
  const storedView = readStorageValue(STORAGE_KEYS.activeView, "home");
  return isKnownView(storedView) ? storedView : "home";
}

function writeStoredView(viewName) {
  if (!isKnownView(viewName)) {
    return;
  }

  writeStorageValue(STORAGE_KEYS.activeView, viewName);
}

function escapeAttributeValue(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeTextContent(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parsePositiveNumber(value) {
  const parsed = Number.parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function estimateE1rm(draft) {
  const weight = parsePositiveNumber(draft.weight);
  const reps = parsePositiveNumber(draft.reps);

  if (!weight || !reps || reps > 12) {
    return null;
  }

  return Math.round(weight * (1 + reps / 30) * 2) / 2;
}

function formatE1rmPreview(draft) {
  const e1rm = estimateE1rm(draft);

  if (!e1rm) {
    return "Enter weight and 1–12 reps.";
  }

  return `${e1rm} kg`;
}

function formatRpeHelper(draft) {
  const rpe = parsePositiveNumber(draft.rpe);

  if (!rpe || rpe < 1 || rpe > 10) {
    return "Enter RPE 1–10.";
  }

  if (rpe <= 6) {
    return "Very easy: keep technique tight.";
  }

  if (rpe <= 7.5) {
    return "Controlled: likely room to build.";
  }

  if (rpe <= 8.5) {
    return "Working range: stay crisp.";
  }

  if (rpe <= 9.5) {
    return "Heavy: protect the next set.";
  }

  return "Limit effort: stop before form breaks.";
}

function readLogDraft() {
  const storedDraft = readStorageValue(STORAGE_KEYS.logDraft, "{}");

  try {
    const parsedDraft = JSON.parse(storedDraft);
    return { ...logDraftDefaults, ...parsedDraft };
  } catch {
    return { ...logDraftDefaults };
  }
}

function writeLogDraft(draft) {
  writeStorageValue(STORAGE_KEYS.logDraft, JSON.stringify(draft));
}

function collectLogDraft() {
  const draft = { ...logDraftDefaults };
  app.querySelectorAll("[data-log-field]").forEach((input) => {
    draft[input.dataset.logField] = input.value;
  });
  return draft;
}

function updateLogPreviews(draft) {
  const e1rmPreview = app.querySelector("[data-e1rm-preview]");
  const rpeHelper = app.querySelector("[data-rpe-helper]");

  if (e1rmPreview) {
    e1rmPreview.textContent = formatE1rmPreview(draft);
  }

  if (rpeHelper) {
    rpeHelper.textContent = formatRpeHelper(draft);
  }
}

function bindLogDraftControls() {
  const inputs = Array.from(app.querySelectorAll("[data-log-field]"));
  const saveButton = app.querySelector("[data-log-save]");
  const status = app.querySelector("[data-log-status]");

  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      const draft = collectLogDraft();
      writeLogDraft(draft);
      updateLogPreviews(draft);
    });
  });

  saveButton?.addEventListener("click", () => {
    writeLogDraft(collectLogDraft());
    if (status) {
      status.textContent = "Draft saved on this device.";
    }
  });
}

function readMeetAttemptDraft() {
  const storedDraft = readStorageValue(STORAGE_KEYS.meetAttemptDraft, "{}");

  try {
    const parsedDraft = JSON.parse(storedDraft);
    return { ...meetAttemptDraftDefaults, ...parsedDraft };
  } catch {
    return { ...meetAttemptDraftDefaults };
  }
}

function writeMeetAttemptDraft(draft) {
  writeStorageValue(STORAGE_KEYS.meetAttemptDraft, JSON.stringify(draft));
}

function collectMeetAttemptDraft() {
  const draft = { ...meetAttemptDraftDefaults };
  app.querySelectorAll("[data-meet-attempt-field]").forEach((input) => {
    draft[input.dataset.meetAttemptField] = input.value;
  });
  return draft;
}

function bindMeetAttemptDraftControls() {
  const inputs = Array.from(app.querySelectorAll("[data-meet-attempt-field]"));
  const saveButton = app.querySelector("[data-meet-attempt-save]");
  const status = app.querySelector("[data-meet-attempt-status]");

  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      writeMeetAttemptDraft(collectMeetAttemptDraft());
      if (status) {
        status.textContent = "Attempt draft updated locally.";
      }
    });
  });

  saveButton?.addEventListener("click", () => {
    writeMeetAttemptDraft(collectMeetAttemptDraft());
    if (status) {
      status.textContent = "Attempt draft saved on this device.";
    }
  });
}

function readMeetMemo() {
  return readStorageValue(STORAGE_KEYS.meetMemo, "");
}

function writeMeetMemo(memo) {
  writeStorageValue(STORAGE_KEYS.meetMemo, memo);
}

function bindMeetMemoControls() {
  const input = app.querySelector("[data-meet-memo]");
  const saveButton = app.querySelector("[data-meet-memo-save]");
  const status = app.querySelector("[data-meet-memo-status]");

  input?.addEventListener("input", () => {
    writeMeetMemo(input.value);
  });

  saveButton?.addEventListener("click", () => {
    writeMeetMemo(input?.value ?? "");
    if (status) {
      status.textContent = "Meet memo saved on this device.";
    }
  });
}

function renderHomeScreen(screen) {
  app.innerHTML = `
    <section class="home-dashboard" aria-labelledby="screen-title">
      <p class="screen-label">${screen.label}</p>
      <div class="home-hero">
        <div>
          <h2 id="screen-title" class="screen-title">${screen.title}</h2>
          <p class="screen-copy">${screen.copy}</p>
        </div>
        <button class="primary-action" type="button">${screen.action}</button>
      </div>
      <div class="status-row" aria-label="Current status">
        ${screen.status.map((item) => `<span class="status-chip">${item}</span>`).join("")}
      </div>
    </section>

    <section class="detail-card goal-card" aria-label="Goal distance">
      <h3>Goal distance</h3>
      <p>${screen.goal}</p>
    </section>

    <section class="detail-card compact-card" aria-label="Wellness state">
      <h3>Wellness state</h3>
      <div class="wellness-grid">
        ${screen.wellness
          .map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`)
          .join("")}
      </div>
    </section>

    <section class="detail-card compact-card" aria-label="Meet countdown">
      <h3>Meet</h3>
      <p>${screen.meet}</p>
    </section>

    <section class="detail-card buddy-note" aria-label="Buddy note">
      <h3>Buddy note</h3>
      <p>${screen.buddy}</p>
    </section>
  `;
}

function renderSetEntryScreen(screen) {
  const logDraft = readLogDraft();

  app.innerHTML = `
    <section class="set-entry-card" aria-labelledby="screen-title">
      <p class="screen-label">${screen.label}</p>
      <h2 id="screen-title" class="screen-title">${screen.title}</h2>
      <p class="screen-copy">${screen.copy}</p>
      <div class="set-grid" aria-label="Set entry order">
        ${screen.fields
          .map(
            ([label, , key]) =>
              `<label><span>${label}</span><input value="${escapeAttributeValue(logDraft[key])}" data-log-field="${key}" /></label>`
          )
          .join("")}
      </div>
      <div class="log-preview-grid" aria-label="Set preview helpers">
        <div class="e1rm-preview" aria-label="Estimated one rep max">
          <span>Estimated 1RM</span>
          <strong data-e1rm-preview>${formatE1rmPreview(logDraft)}</strong>
        </div>
        <div class="rpe-helper" aria-label="RPE helper">
          <span>RPE helper</span>
          <strong data-rpe-helper>${formatRpeHelper(logDraft)}</strong>
        </div>
      </div>
      <button class="save-action" type="button" data-log-save>${screen.action}</button>
    </section>
    <section class="detail-card" aria-label="Secondary memo">
      <h3>Memo</h3>
      <p data-log-status>${screen.memo}</p>
    </section>
  `;

  bindLogDraftControls();
}

function renderTrainingPlanScreen(screen) {
  app.innerHTML = `
    <section class="plan-card" aria-labelledby="screen-title">
      <p class="screen-label">${screen.label}</p>
      <h2 id="screen-title" class="screen-title">${screen.title}</h2>
      <p class="screen-copy">${screen.copy}</p>
      <div class="plan-main" aria-label="Today's main work">
        <span>Main lift</span>
        <strong>${screen.mainLift}</strong>
      </div>
      <div class="plan-stack" aria-label="Today's work prescription">
        <div><span>Top set</span><strong>${screen.topSet}</strong></div>
        <div><span>Backoff</span><strong>${screen.backoff}</strong></div>
        <div><span>Target</span><strong>${screen.target}</strong></div>
      </div>
      <div class="cycle-grid" aria-label="Training cycle status">
        ${screen.cycle
          .map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`)
          .join("")}
      </div>
    </section>
    <section class="detail-card" aria-label="Adjustment rule">
      <h3>Adjustment rule</h3>
      <p>${screen.rule}</p>
    </section>
    <section class="detail-card buddy-note" aria-label="Buddy note">
      <h3>Buddy note</h3>
      <p>${screen.buddy}</p>
    </section>
  `;
}

function renderDataScreen(screen) {
  app.innerHTML = `
    <section class="data-card" aria-labelledby="screen-title">
      <p class="screen-label">${screen.label}</p>
      <h2 id="screen-title" class="screen-title">${screen.title}</h2>
      <p class="screen-copy">${screen.copy}</p>
      <div class="judgment-panel" aria-label="Training judgment">
        <span>Judgment</span>
        <strong>${screen.judgment}</strong>
      </div>
      <div class="signal-grid" aria-label="Training signals">
        ${screen.signals
          .map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`)
          .join("")}
      </div>
    </section>
    <section class="detail-card" aria-label="Next recommendation">
      <h3>Next recommendation</h3>
      <p>${screen.recommendation}</p>
    </section>
    <section class="detail-card buddy-note" aria-label="Buddy note">
      <h3>Buddy note</h3>
      <p>${screen.buddy}</p>
    </section>
  `;
}

function renderMeetScreen(screen) {
  const meetAttemptDraft = readMeetAttemptDraft();
  const meetMemo = readMeetMemo();

  app.innerHTML = `
    <section class="meet-card" aria-labelledby="screen-title">
      <p class="screen-label">${screen.label}</p>
      <h2 id="screen-title" class="screen-title">${screen.title}</h2>
      <p class="screen-copy">${screen.copy}</p>
      <div class="meet-status" aria-label="Meet status">
        <span>Status</span>
        <strong>${screen.status}</strong>
      </div>
      <div class="attempt-grid" aria-label="Attempt placeholders">
        ${screen.attempts
          .map(([label, , key]) => `<div><span>${label}</span><strong>${escapeTextContent(meetAttemptDraft[key])}</strong></div>`)
          .join("")}
      </div>
    </section>
    <section class="detail-card" aria-label="Meet readiness order">
      <h3>Readiness order</h3>
      <ol class="readiness-list">
        ${screen.readiness.map((item) => `<li>${item}</li>`).join("")}
      </ol>
    </section>
    <section class="detail-card" aria-label="Attempt notes">
      <h3>Attempt notes</h3>
      <ol class="readiness-list">
        ${MEET_ATTEMPT_NOTES.map((item) => `<li>${item}</li>`).join("")}
      </ol>
    </section>
    <section class="detail-card" aria-label="Attempt draft">
      <h3>Attempt draft</h3>
      <div class="set-grid" aria-label="Saved attempt draft">
        ${screen.attempts
          .map(
            ([label, , key]) =>
              `<label><span>${label}</span><input value="${escapeAttributeValue(meetAttemptDraft[key])}" data-meet-attempt-field="${key}" /></label>`
          )
          .join("")}
      </div>
      <button class="save-action" type="button" data-meet-attempt-save>Save attempt draft</button>
      <p class="save-status" data-meet-attempt-status>Attempt draft stays on this device.</p>
    </section>
    <section class="detail-card" aria-label="Meet memo">
      <h3>Meet memo</h3>
      <textarea class="meet-memo-box" data-meet-memo placeholder="Rack heights, commands, opener thoughts">${escapeTextContent(meetMemo)}</textarea>
      <button class="save-action" type="button" data-meet-memo-save>Save meet memo</button>
      <p class="save-status" data-meet-memo-status>Memo stays on this device.</p>
    </section>
    <section class="detail-card" aria-label="Meet checklist">
      <h3>Checklist</h3>
      <div class="checklist-row">
        ${screen.checks.map((item) => `<span>${item}</span>`).join("")}
      </div>
    </section>
    <section class="detail-card" aria-label="White light rules">
      <h3>White light focus</h3>
      <p>${screen.rules}</p>
    </section>
    <section class="detail-card buddy-note" aria-label="Buddy note">
      <h3>Buddy note</h3>
      <p>${screen.buddy}</p>
    </section>
  `;

  bindMeetAttemptDraftControls();
  bindMeetMemoControls();
}

function renderPlaceholderScreen(screen) {
  app.innerHTML = `
    <section class="primary-card" aria-labelledby="screen-title">
      <p class="screen-label">${screen.label}</p>
      <h2 id="screen-title" class="screen-title">${screen.title}</h2>
      <p class="screen-copy">${screen.copy}</p>
      <div class="action-row" aria-label="Key placeholders">
        <div class="action-chip"><strong>${screen.primary[0]}</strong><span>${screen.primary[1]}</span></div>
        <div class="action-chip"><strong>${screen.secondary[0]}</strong><span>${screen.secondary[1]}</span></div>
      </div>
    </section>
    <section class="detail-card" aria-label="Buddy note">
      <h3>Buddy note</h3>
      <p>必要な情報だけを出す。入力を邪魔しない。ここでは静かな一言だけを置きます。</p>
    </section>
  `;
}

function renderScreen(viewName) {
  const screen = screens[viewName] ?? screens.home;

  if (viewName === "home") {
    renderHomeScreen(screen);
    return;
  }

  if (viewName === "log") {
    renderSetEntryScreen(screen);
    return;
  }

  if (viewName === "plan") {
    renderTrainingPlanScreen(screen);
    return;
  }

  if (viewName === "data") {
    renderDataScreen(screen);
    return;
  }

  if (viewName === "meet") {
    renderMeetScreen(screen);
    return;
  }

  renderPlaceholderScreen(screen);
}

function setActiveNav(viewName) {
  navItems.forEach((item) => {
    const isActive = item.dataset.view === viewName;
    item.classList.toggle("is-active", isActive);
    if (isActive) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });
}

function navigate(viewName) {
  if (!isKnownView(viewName)) {
    return;
  }

  renderScreen(viewName);
  setActiveNav(viewName);
  writeStoredView(viewName);
}

navItems.forEach((item) => {
  item.addEventListener("click", () => navigate(item.dataset.view));
});

navigate(readStoredView());