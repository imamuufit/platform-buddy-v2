import { formatKg, liftLabel } from "./buddy-method.js";
import { readArrayStorage, readJsonStorage, STORAGE_KEYS, writeJsonStorage } from "./storage.js";

const PROFILE_VERSION = 1;

const DEFAULT_PROFILE = {
  version: PROFILE_VERSION,
  name: "",
  height: "",
  bodyweight: "",
  competitionSex: "",
  residencePrefecture: "",
  workSchoolPrefecture: "",
  gymPrefecture: "",
  studentFederationStatus: "none",
  eventPreference: "undecided",
  equipmentPreference: "undecided",
  createdAt: "",
  updatedAt: ""
};

const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県"
];

const OFFICIAL_LINKS = [
  {
    title: "JPA公式サイト",
    href: "https://www.jpa-powerlifting.or.jp/",
    note: "大会情報、登録案内、通達の入口です。"
  },
  {
    title: "選手・審判・団体の登録",
    href: "https://www.jpa-powerlifting.or.jp/contact.php",
    note: "所属支部の選択条件とシクミネット導線を確認します。"
  },
  {
    title: "ルール及び通達",
    href: "https://www.jpa-powerlifting.or.jp/rules-members.php",
    note: "ルールブック、技術委員会通達、標準記録の掲載ページです。"
  },
  {
    title: "ルールブック（最新版掲載ページ）",
    href: "https://www.jpa-powerlifting.or.jp/rules-members.php",
    note: "PDF直リンクは変わる可能性があるため、公式掲載ページへ進みます。"
  },
  {
    title: "IPFルールブック和訳（最新版掲載ページ）",
    href: "https://www.jpa-powerlifting.or.jp/rules-members.php",
    note: "和訳PDFの最新版を公式ページ内で確認します。"
  },
  {
    title: "標準記録（最新版掲載ページ）",
    href: "https://www.jpa-powerlifting.or.jp/rules-members.php",
    note: "出場資格の確認は公式掲載ページから行います。"
  },
  {
    title: "加盟都道府県協会リンク",
    href: "https://www.jpa-powerlifting.or.jp/overview.php",
    note: "登録候補の都道府県協会を確認します。"
  }
];

const COMPETITION_SEX_LABELS = {
  male: "男子",
  female: "女子"
};

const FEDERATION_LABELS = {
  none: "該当なし",
  student: "学生連盟に関係あり",
  high_school: "高校連盟に関係あり",
  unsure: "要確認"
};

const EVENT_LABELS = {
  powerlifting: "三種",
  bench: "ベンチプレス",
  both: "両方",
  undecided: "未定"
};

const EQUIPMENT_LABELS = {
  classic: "クラシック",
  equipped: "EQ",
  undecided: "未定"
};

let editingProfile = false;

export function renderLifterProfileHome({ settings, program }) {
  const profile = readLifterProfile();
  const isRegistered = hasRequiredProfile(profile);
  const shouldShowForm = !isRegistered || editingProfile;
  const logs = readArrayStorage(STORAGE_KEYS.trainingLogs, []);
  const nextTraining = nextTrainingFromLogs(program, logs);

  if (shouldShowForm) {
    return `
      ${renderHero({
        title: "あなたをリフターとして登録します。",
        copy: "初回HOMEで競技者プロフィールを作成し、登録候補協会と公式確認リンクをひと目で見える状態にします。"
      })}
      ${renderProfileForm(profile, isRegistered)}
      ${renderOfficialLinks()}
      ${renderBuddyNote("所属協会を確認すると、大会への道筋が見えます。最終判断は必ずJPA公式案内と所属先で確認してください。")}
    `;
  }

  return `
    ${renderHero({
      title: "今日の練習は、試技台につながっています。",
      copy: "HOMEは練習の司令塔であり、競技者としての現在地を確認する画面です。"
    })}
    ${renderLifterCard(profile)}
    ${renderTodayTraining(nextTraining, settings)}
    ${renderLastLog(logs)}
    ${renderOfficialLinks()}
    ${renderNextStep(profile)}
    ${renderBuddyNote("ルールを知ることは、白判定を増やすことです。強くなる準備と、試合に出る準備を同じ画面で整えます。")}
  `;
}

export function bindLifterProfileHome(app, { onNavigate, onRefresh }) {
  const form = app.querySelector("[data-lifter-profile-form]");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const nextProfile = profileFromForm(form, readLifterProfile());
      const status = app.querySelector("[data-profile-status]");

      if (!hasRequiredProfile(nextProfile)) {
        if (status) {
          status.textContent = "名前、体重、現住所の都道府県を入力してください。";
          status.classList.add("is-error");
        }
        return;
      }

      writeJsonStorage(STORAGE_KEYS.lifterProfile, nextProfile);
      editingProfile = false;
      onRefresh();
    });
  }

  app.querySelector("[data-edit-profile]")?.addEventListener("click", () => {
    editingProfile = true;
    onRefresh();
  });

  app.querySelector("[data-cancel-profile-edit]")?.addEventListener("click", () => {
    editingProfile = false;
    onRefresh();
  });

  app.querySelector("[data-open-log]")?.addEventListener("click", () => onNavigate("log"));
  app.querySelector("[data-open-plan]")?.addEventListener("click", () => onNavigate("plan"));
  app.querySelector("[data-open-meet]")?.addEventListener("click", () => onNavigate("meet"));
}

function readLifterProfile() {
  return normalizeProfile(readJsonStorage(STORAGE_KEYS.lifterProfile, DEFAULT_PROFILE));
}

function normalizeProfile(input = {}) {
  const merged = { ...DEFAULT_PROFILE, ...(input || {}) };
  return {
    version: PROFILE_VERSION,
    name: String(merged.name || "").trim(),
    height: String(merged.height || "").trim(),
    bodyweight: String(merged.bodyweight || "").trim(),
    competitionSex: normalizeChoice(merged.competitionSex, ["male", "female", ""]),
    residencePrefecture: normalizePrefecture(merged.residencePrefecture),
    workSchoolPrefecture: normalizePrefecture(merged.workSchoolPrefecture),
    gymPrefecture: normalizePrefecture(merged.gymPrefecture),
    studentFederationStatus: normalizeChoice(merged.studentFederationStatus, ["none", "student", "high_school", "unsure"], "none"),
    eventPreference: normalizeChoice(merged.eventPreference, ["powerlifting", "bench", "both", "undecided"], "undecided"),
    equipmentPreference: normalizeChoice(merged.equipmentPreference, ["classic", "equipped", "undecided"], "undecided"),
    createdAt: String(merged.createdAt || ""),
    updatedAt: String(merged.updatedAt || "")
  };
}

function profileFromForm(form, previousProfile) {
  const formData = new FormData(form);
  const now = new Date().toISOString();

  return normalizeProfile({
    ...previousProfile,
    name: formData.get("name"),
    height: formData.get("height"),
    bodyweight: formData.get("bodyweight"),
    competitionSex: formData.get("competitionSex"),
    residencePrefecture: formData.get("residencePrefecture"),
    workSchoolPrefecture: formData.get("workSchoolPrefecture"),
    gymPrefecture: formData.get("gymPrefecture"),
    studentFederationStatus: formData.get("studentFederationStatus"),
    eventPreference: formData.get("eventPreference"),
    equipmentPreference: formData.get("equipmentPreference"),
    createdAt: previousProfile.createdAt || now,
    updatedAt: now
  });
}

function hasRequiredProfile(profile) {
  return Boolean(profile.name && profile.bodyweight && profile.residencePrefecture);
}

function renderHero({ title, copy }) {
  return `
    <section class="hero-panel" aria-labelledby="screen-title">
      <p class="screen-label">HOME</p>
      <h2 id="screen-title" class="screen-title">${escapeText(title)}</h2>
      <p class="screen-copy">${escapeText(copy)}</p>
      <button class="primary-action" type="button" data-open-plan>PLANを開く</button>
    </section>
  `;
}

function renderProfileForm(profile, isRegistered) {
  return `
    <section class="settings-panel lifter-profile-panel" aria-label="Lifter profile onboarding">
      <div class="section-heading">
        <span>Lifter Profile</span>
        <strong>競技者プロフィール作成</strong>
      </div>
      <p class="panel-note">登録先は断定せず、住居地・勤務/在学地・所属ジム所在地から候補を表示します。</p>
      <form class="settings-form lifter-profile-form" data-lifter-profile-form>
        <label>
          <span>名前 必須</span>
          <input name="name" autocomplete="name" required value="${escapeAttribute(profile.name)}" />
        </label>

        <label>
          <span>体重 kg 必須</span>
          <input name="bodyweight" type="number" inputmode="decimal" min="0" step="0.1" required value="${escapeAttribute(profile.bodyweight)}" />
        </label>

        <label>
          <span>身長 cm 任意</span>
          <input name="height" type="number" inputmode="decimal" min="0" step="0.1" value="${escapeAttribute(profile.height)}" />
        </label>

        <label>
          <span>大会出場区分 任意</span>
          <select name="competitionSex">
            ${option("", "未設定", profile.competitionSex)}
            ${option("male", "男子", profile.competitionSex)}
            ${option("female", "女子", profile.competitionSex)}
          </select>
        </label>

        <label>
          <span>現住所の都道府県 必須</span>
          <select name="residencePrefecture" required>
            ${prefectureOptions(profile.residencePrefecture)}
          </select>
        </label>

        <label>
          <span>勤務・在学地の都道府県 任意</span>
          <select name="workSchoolPrefecture">
            ${prefectureOptions(profile.workSchoolPrefecture)}
          </select>
        </label>

        <label>
          <span>所属ジムの都道府県 任意</span>
          <select name="gymPrefecture">
            ${prefectureOptions(profile.gymPrefecture)}
          </select>
        </label>

        <label>
          <span>学生連盟 / 高校連盟</span>
          <select name="studentFederationStatus">
            ${option("none", "該当なし", profile.studentFederationStatus)}
            ${option("student", "学生連盟に関係あり", profile.studentFederationStatus)}
            ${option("high_school", "高校連盟に関係あり", profile.studentFederationStatus)}
            ${option("unsure", "要確認", profile.studentFederationStatus)}
          </select>
        </label>

        <label>
          <span>出たい大会種別</span>
          <select name="eventPreference">
            ${option("powerlifting", "三種", profile.eventPreference)}
            ${option("bench", "ベンチプレス", profile.eventPreference)}
            ${option("both", "両方", profile.eventPreference)}
            ${option("undecided", "未定", profile.eventPreference)}
          </select>
        </label>

        <label>
          <span>装備区分</span>
          <select name="equipmentPreference">
            ${option("classic", "クラシック", profile.equipmentPreference)}
            ${option("equipped", "EQ", profile.equipmentPreference)}
            ${option("undecided", "未定", profile.equipmentPreference)}
          </select>
        </label>

        <button class="primary-action" type="submit">${isRegistered ? "プロフィールを更新" : "Lifter Cardを作成"}</button>
        ${isRegistered ? `<button class="secondary-action" type="button" data-cancel-profile-edit>戻る</button>` : ""}
        <p class="form-note" data-profile-status>この端末のlocalStorageに保存されます。登録先は候補として表示します。</p>
      </form>
    </section>
  `;
}

function renderLifterCard(profile) {
  const candidates = associationCandidates(profile);
  return `
    <section class="lifter-card" aria-label="Lifter card">
      <div class="lifter-card-header">
        <div>
          <span>Lifter Card</span>
          <strong>${escapeText(profile.name)}</strong>
        </div>
        <button class="text-action" type="button" data-edit-profile>編集</button>
      </div>
      <div class="profile-grid">
        ${profileMetric("体重", `${escapeText(profile.bodyweight)}kg`)}
        ${profileMetric("大会区分", labelFor(COMPETITION_SEX_LABELS, profile.competitionSex, "未設定"))}
        ${profileMetric("出たい大会", labelFor(EVENT_LABELS, profile.eventPreference, "未定"))}
        ${profileMetric("装備", labelFor(EQUIPMENT_LABELS, profile.equipmentPreference, "未定"))}
      </div>
      <div class="association-block">
        <span>登録候補協会</span>
        <ul class="association-list">
          ${candidates.map((candidate) => `
            <li>
              <strong>登録候補：${escapeText(candidate.association)}</strong>
              <small>${escapeText(candidate.sources.join("、"))}に基づく候補です。</small>
            </li>
          `).join("")}
        </ul>
        <p>現住所、勤務・在学地、所属ジム所在地のいずれかに基づく候補です。最終判断はJPA公式案内、所属先、都道府県協会に確認してください。</p>
      </div>
      ${renderFederationNote(profile)}
    </section>
  `;
}

function renderTodayTraining(nextTraining, settings) {
  return `
    <section class="detail-card today-training-card" aria-label="Today training">
      <div class="section-heading">
        <span>Today Training</span>
        <strong>Week ${nextTraining.week} / Day ${nextTraining.day}</strong>
      </div>
      <div class="work-row main-work">
        <div>
          <span>${escapeText(liftLabel(nextTraining.mainItem?.lift))}</span>
          <strong>${escapeText(nextTraining.mainItem?.prescription?.title || nextTraining.dayTitle)}</strong>
        </div>
        <dl>
          <div><dt>%1RM</dt><dd>${escapeText(nextTraining.mainItem?.prescription?.percent || "-")}</dd></div>
          <div><dt>set</dt><dd>${escapeText(nextTraining.mainItem?.prescription?.sets || "-")}</dd></div>
          <div><dt>rep</dt><dd>${escapeText(nextTraining.mainItem?.prescription?.reps || "-")}</dd></div>
          <div><dt>RPE</dt><dd>${escapeText(nextTraining.mainItem?.prescription?.rpe || "-")}</dd></div>
        </dl>
        <p>${escapeText(nextTraining.mainItem?.prescription?.note || "PLANで今日の内容を確認してください。")}</p>
      </div>
      <p class="panel-note">現在1RM: ${escapeText(currentMaxSummary(settings))}</p>
      <button class="primary-action" type="button" data-open-log>LOGへ進む</button>
    </section>
  `;
}

function renderLastLog(logs) {
  const lastLog = latestLog(logs);
  if (!lastLog) {
    return `
      <section class="detail-card" aria-label="Last log">
        <div class="section-heading">
          <span>前回LOG</span>
          <strong>まだ保存LOGがありません</strong>
        </div>
        <p>今日のメインセットを終えたら、LOGで重量・rep・RPEを残します。</p>
      </section>
    `;
  }

  return `
    <section class="detail-card" aria-label="Last log">
      <div class="section-heading">
        <span>前回LOG</span>
        <strong>${escapeText(lastLog.date || "日付未設定")} / ${escapeText(liftLabel(lastLog.lift))}</strong>
      </div>
      <p>${escapeText(logSummary(lastLog))}</p>
    </section>
  `;
}

function renderOfficialLinks() {
  return `
    <section class="official-links" aria-label="Official links">
      <div class="section-heading">
        <span>Official Links</span>
        <strong>公式リンク</strong>
      </div>
      <div class="official-link-list">
        ${OFFICIAL_LINKS.map((link) => `
          <a href="${escapeAttribute(link.href)}" target="_blank" rel="noopener noreferrer">
            <strong>${escapeText(link.title)}</strong>
            <span>${escapeText(link.note)}</span>
          </a>
        `).join("")}
      </div>
    </section>
  `;
}

function renderNextStep(profile) {
  const federationText = profile.studentFederationStatus === "none"
    ? "所属協会候補を確認"
    : "連盟該当条件を公式案内で確認";

  return `
    <section class="next-step-card" aria-label="Next step">
      <div class="section-heading">
        <span>Next Step</span>
        <strong>次に確認すること</strong>
      </div>
      <div class="step-list">
        <a href="${escapeAttribute(OFFICIAL_LINKS[1].href)}" target="_blank" rel="noopener noreferrer">
          <strong>選手登録ページを確認</strong>
          <span>${escapeText(federationText)}</span>
        </a>
        <a href="${escapeAttribute(OFFICIAL_LINKS[2].href)}" target="_blank" rel="noopener noreferrer">
          <strong>ルール及び通達を確認</strong>
          <span>白判定につながる最新ルールを確認します。</span>
        </a>
        <button type="button" data-open-meet>
          <strong>MEETで大会日を設定</strong>
          <span>大会予定を入れると準備の距離感が見えます。</span>
        </button>
      </div>
    </section>
  `;
}

function renderBuddyNote(text) {
  return `
    <section class="buddy-note" aria-label="Buddy note">
      <span>Buddy note</span>
      <p>${escapeText(text)}</p>
    </section>
  `;
}

function renderFederationNote(profile) {
  if (profile.studentFederationStatus === "none") return "";

  return `
    <div class="federation-note">
      <span>連盟確認</span>
      <p>${escapeText(labelFor(FEDERATION_LABELS, profile.studentFederationStatus, "要確認"))}。学生連盟または高校連盟に該当する場合は、JPA公式案内と所属先で登録先を確認してください。</p>
    </div>
  `;
}

function nextTrainingFromLogs(program, logs) {
  const fallback = trainingAt(program, 1, 1);
  const lastLog = latestLog(logs);
  if (!lastLog?.plan?.week || !lastLog?.plan?.day) return fallback;

  const lastWeek = Number(lastLog.plan.week);
  const lastDay = Number(lastLog.plan.day);
  const week = program.weeks[lastWeek - 1];
  if (!week) return fallback;

  if (lastDay < week.days.length) return trainingAt(program, lastWeek, lastDay + 1);
  if (lastWeek < program.weeks.length) return trainingAt(program, lastWeek + 1, 1);
  return trainingAt(program, lastWeek, lastDay);
}

function trainingAt(program, weekNumber, dayNumber) {
  const week = program.weeks[weekNumber - 1] || program.weeks[0];
  const day = week?.days[dayNumber - 1] || week?.days[0];
  const mainItem = day?.items?.find((item) => item.type === "main") || day?.items?.[0];

  return {
    week: week?.week || 1,
    day: dayNumber,
    dayTitle: day?.title || "PLAN未生成",
    mainItem
  };
}

function latestLog(logs) {
  return [...logs]
    .filter((log) => log && typeof log === "object")
    .sort((a, b) => String(b.createdAt || b.date || "").localeCompare(String(a.createdAt || a.date || "")))[0];
}

function associationCandidates(profile) {
  const sourcePairs = [
    ["現住所", profile.residencePrefecture],
    ["勤務・在学地", profile.workSchoolPrefecture],
    ["所属ジム所在地", profile.gymPrefecture]
  ];
  const candidates = new Map();

  sourcePairs.forEach(([source, prefecture]) => {
    if (!prefecture) return;
    const current = candidates.get(prefecture) || {
      association: `${prefecture}パワーリフティング協会`,
      sources: []
    };
    current.sources.push(source);
    candidates.set(prefecture, current);
  });

  return [...candidates.values()];
}

function currentMaxSummary(settings) {
  return Object.entries(settings.maxes)
    .filter(([, value]) => Number(value) > 0)
    .map(([lift, value]) => `${liftLabel(lift)} ${formatKg(value)}kg`)
    .join(" / ");
}

function logSummary(log) {
  const pieces = [
    log.plan?.week && log.plan?.day ? `Week ${log.plan.week} / Day ${log.plan.day}` : "",
    log.weight ? `${formatKg(log.weight)}kg` : "",
    log.reps ? `${log.reps}rep` : "",
    log.sets ? `${log.sets}set` : "",
    log.rpe ? `RPE ${log.rpe}` : "",
    log.e1rm ? `e1RM ${formatKg(log.e1rm)}kg` : ""
  ].filter(Boolean);

  return pieces.join(" / ") || "保存LOGを確認してください。";
}

function profileMetric(label, value) {
  return `
    <article>
      <span>${escapeText(label)}</span>
      <strong>${escapeText(value)}</strong>
    </article>
  `;
}

function prefectureOptions(currentValue) {
  return [
    option("", "選択してください", currentValue),
    ...PREFECTURES.map((prefecture) => option(prefecture, prefecture, currentValue))
  ].join("");
}

function option(value, label, currentValue) {
  return `<option value="${escapeAttribute(value)}" ${String(value) === String(currentValue) ? "selected" : ""}>${escapeText(label)}</option>`;
}

function normalizePrefecture(value) {
  const normalizedValue = String(value || "");
  return PREFECTURES.includes(normalizedValue) ? normalizedValue : "";
}

function normalizeChoice(value, allowedValues, fallbackValue = "") {
  const normalizedValue = String(value || "");
  return allowedValues.includes(normalizedValue) ? normalizedValue : fallbackValue;
}

function labelFor(labels, value, fallbackValue) {
  return labels[value] || fallbackValue;
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
