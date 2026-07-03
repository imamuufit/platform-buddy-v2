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
    title: "今日の処方を先に見る。",
    copy: "スクワット、ベンチ、デッドリフトの予定を確認する画面の土台です。詳細設定よりも今日の実行を優先します。",
    primary: ["Main", "主運動"],
    secondary: ["Backoff", "補助セット"]
  },
  data: {
    label: "DATA",
    title: "グラフより先に、判断を出す。",
    copy: "e1RM、RPE、疲労感、実行率から次の調整を見せる画面の土台です。今回のPRでは計算ロジックはまだ追加しません。",
    primary: ["Judgment", "次の調整"],
    secondary: ["Trend", "推移確認"]
  },
  meet: {
    label: "MEET",
    title: "試合の日に迷わない準備。",
    copy: "試技順、白判定、申告重量、持ち物、当日の流れをまとめる画面の土台です。学習コンテンツより実戦準備を優先します。",
    primary: ["Attempts", "試技準備"],
    secondary: ["Rules", "白判定確認"]
  }
};

const app = document.querySelector("#app");
const navItems = Array.from(document.querySelectorAll(".nav-item"));

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
  renderScreen(viewName);
  setActiveNav(viewName);
}

navItems.forEach((item) => {
  item.addEventListener("click", () => navigate(item.dataset.view));
});

renderScreen("home");
