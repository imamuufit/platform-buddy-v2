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
      ["Lift", "Bench press"],
      ["Weight", "120 kg"],
      ["Reps", "5"],
      ["RPE", "8"]
    ],
    action: "Save set",
    memo: "Memo: bar path felt steady."
  },
  plan: {
    label: "PLAN",
    title: "Today's prescription",
    copy: "設定より先に、今日やる内容を確認します。数値は静的な仮置きで、処方ロジックはまだ追加しません。",
    mainLift: "Bench press",
    topSet: "Top set: 120 kg × 5 @ RPE 8",
    backoff: "Backoff: 105 kg × 5 × 3",
    target: "Target: crisp reps, stable pause",
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
      ["Squat", "Opener not set"],
      ["Bench", "Opener not set"],
      ["Deadlift", "Opener not set"]
    ],
    checks: ["Rack height", "Equipment", "Weigh-in", "Warm-up timing"],
    rules: "White lights first: commands, depth, pause, lockout, and control before load selection.",
    buddy: "Buddy note: The first attempt is not a statement. It is an entry ticket."
  }
};

const app = document.querySelector("#app");
const navItems = Array.from(document.querySelectorAll(".nav-item"));
const storageKey = "platformBuddy.activeView";

function isKnownView(viewName) {
  return Object.prototype.hasOwnProperty.call(screens, viewName);
}

function readStoredView() {
  try {
    const storedView = window.localStorage.getItem(storageKey);
    return isKnownView(storedView) ? storedView : "home";
  } catch {
    return "home";
  }
}

function writeStoredView(viewName) {
  if (!isKnownView(viewName)) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, viewName);
  } catch {
    // Keep navigation usable when storage is unavailable.
  }
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
  app.innerHTML = `
    <section class="set-entry-card" aria-labelledby="screen-title">
      <p class="screen-label">${screen.label}</p>
      <h2 id="screen-title" class="screen-title">${screen.title}</h2>
      <p class="screen-copy">${screen.copy}</p>
      <div class="set-grid" aria-label="Set entry order">
        ${screen.fields
          .map(([label, value]) => `<label><span>${label}</span><input value="${value}" readonly /></label>`)
          .join("")}
      </div>
      <button class="save-action" type="button">${screen.action}</button>
    </section>
    <section class="detail-card" aria-label="Secondary memo">
      <h3>Memo</h3>
      <p>${screen.memo}</p>
    </section>
  `;
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
          .map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`)
          .join("")}
      </div>
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
