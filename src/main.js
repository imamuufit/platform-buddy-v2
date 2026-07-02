const screens = {
  home: {
    label: "HOME",
    title: "今日の判断を、最初に置く。",
    copy: "次にやることを一画面で確認するための入口です。ここでは記録、予定、回復感、試合準備への導線だけを静かに並べます。",
    primary: ["Today", "今日の優先事項"],
    secondary: ["Readiness", "状態確認"]
  },
  log: {
    label: "LOG",
    title: "紙より速く、セットを残す。",
    copy: "重量、回数、RPE、メモを最短で記録する画面の土台です。今回のPRでは入力ロジックはまだ追加しません。",
    primary: ["Set", "重量・回数"],
    secondary: ["RPE", "主観強度"]
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

function renderScreen(viewName) {
  const screen = screens[viewName] ?? screens.home;

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
