import { formatKg, liftLabel } from "./buddy-method.js";
import { readJsonStorage, STORAGE_KEYS, writeJsonStorage } from "./storage.js";
import { latestLog, nextTrainingFromLogs, readLogs, recommendationForLog, suggestedValuesForSegment, workSegmentsForItem, workTypeLabel } from "./training-log.js";

const PROFILE_VERSION = 1;
const DEFAULT_PROFILE = { version: PROFILE_VERSION, name: "", height: "", bodyweight: "", competitionSex: "", residencePrefecture: "", workSchoolPrefecture: "", gymPrefecture: "", studentFederationStatus: "none", eventPreference: "undecided", equipmentPreference: "undecided", createdAt: "", updatedAt: "" };
const PREFECTURES = "北海道 青森県 岩手県 宮城県 秋田県 山形県 福島県 茨城県 栃木県 群馬県 埼玉県 千葉県 東京都 神奈川県 新潟県 富山県 石川県 福井県 山梨県 長野県 岐阜県 静岡県 愛知県 三重県 滋賀県 京都府 大阪府 兵庫県 奈良県 和歌山県 鳥取県 島根県 岡山県 広島県 山口県 徳島県 香川県 愛媛県 高知県 福岡県 佐賀県 長崎県 熊本県 大分県 宮崎県 鹿児島県 沖縄県".split(" ");
const OFFICIAL_LINKS = [
  ["JPA公式サイト", "https://www.jpa-powerlifting.or.jp/", "大会情報、登録案内、通達の入口です。"],
  ["選手・審判・団体の登録", "https://www.jpa-powerlifting.or.jp/contact.php", "所属支部の選択条件とシクミネット導線を確認します。"],
  ["ルール及び通達", "https://www.jpa-powerlifting.or.jp/rules-members.php", "ルールブック、技術委員会通達、標準記録の掲載ページです。"],
  ["加盟都道府県協会リンク", "https://www.jpa-powerlifting.or.jp/overview.php", "登録候補の都道府県協会を確認します。"]
].map(([title, href, note]) => ({ title, href, note }));
const COMPETITION_SEX_LABELS = { male: "男子", female: "女子" };
const BODYWEIGHT_CLASSES = {
  male: [[53, "53kg級", "IPFではサブジュニア/ジュニアのみ。一般区分での扱いは大会要項で確認してください。"], [59, "59kg級"], [66, "66kg級"], [74, "74kg級"], [83, "83kg級"], [93, "93kg級"], [105, "105kg級"], [120, "120kg級"], [Infinity, "120kg超級"]],
  female: [[43, "43kg級", "IPFではサブジュニア/ジュニアのみ。一般区分での扱いは大会要項で確認してください。"], [47, "47kg級"], [52, "52kg級"], [57, "57kg級"], [63, "63kg級"], [69, "69kg級"], [76, "76kg級"], [84, "84kg級"], [Infinity, "84kg超級"]]
};
let editingProfile = false;

export function renderLifterProfileHome({ settings, program }) {
  const profile = readLifterProfile();
  const isRegistered = hasRequiredProfile(profile);
  const logs = readLogs();
  const nextTraining = nextTrainingFromLogs(program, logs);
  if (!isRegistered || editingProfile) {
    return `${renderHero("あなたをリフターとして登録します。", "名前、大会区分、体重、現住所だけでLifter Cardを作成し、体重階級と登録候補協会を自動表示します。")}${renderTodayTraining(nextTraining, settings)}${renderLastLog(logs)}${renderProfileForm(profile, isRegistered)}${renderOfficialLinks()}${renderBuddyNote("登録候補協会は現住所から表示します。最終判断は必ずJPA公式案内と所属先で確認してください。")}`;
  }
  return `${renderHero("今日の練習は、試技台につながっています。", "HOMEは練習の司令塔であり、競技者としての現在地を確認する画面です。")}${renderTodayTraining(nextTraining, settings)}${renderLastLog(logs)}${renderHomeJudgment(logs)}${renderLifterCard(profile)}${renderOfficialLinks()}${renderNextStep()}${renderBuddyNote("ルールを知ることは、白判定を増やすことです。強くなる準備と、試合に出る準備を同じ画面で整えます。")}`;
}

export function bindLifterProfileHome(app, { onNavigate, onRefresh }) {
  const form = app.querySelector("[data-lifter-profile-form]");
  if (form) {
    const updatePreview = () => {
      const preview = form.querySelector("[data-weight-class-preview]");
      if (preview) preview.textContent = weightClassPreviewText(profileFromForm(form, readLifterProfile()));
    };
    form.querySelectorAll("[name='competitionSex'], [name='bodyweight']").forEach((field) => {
      field.addEventListener("input", updatePreview);
      field.addEventListener("change", updatePreview);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const nextProfile = profileFromForm(form, readLifterProfile());
      const status = app.querySelector("[data-profile-status]");
      if (!hasRequiredProfile(nextProfile)) {
        if (status) {
          status.textContent = "名前、大会出場区分、体重、現住所の都道府県を入力してください。";
          status.classList.add("is-error");
        }
        return;
      }
      writeJsonStorage(STORAGE_KEYS.lifterProfile, nextProfile);
      editingProfile = false;
      onRefresh();
    });
  }
  app.querySelector("[data-edit-profile]")?.addEventListener("click", () => { editingProfile = true; onRefresh(); });
  app.querySelector("[data-cancel-profile-edit]")?.addEventListener("click", () => { editingProfile = false; onRefresh(); });
  app.querySelector("[data-send-to-log]")?.addEventListener("click", (event) => {
    const b = event.currentTarget;
    writeJsonStorage(STORAGE_KEYS.logDraft, { date: today(), week: Number(b.dataset.week || 1), day: Number(b.dataset.day || 1), itemIndex: Number(b.dataset.itemIndex || 0), workType: String(b.dataset.workType || "top"), weight: String(b.dataset.weight || ""), reps: String(b.dataset.reps || ""), sets: String(b.dataset.sets || ""), rpe: String(b.dataset.rpe || ""), rir: "", formQuality: "steady", fatigue: "normal", memo: "" });
    onNavigate("log");
  });
  app.querySelector("[data-open-log]")?.addEventListener("click", () => onNavigate("log"));
  app.querySelector("[data-open-plan]")?.addEventListener("click", () => onNavigate("plan"));
  app.querySelector("[data-open-meet]")?.addEventListener("click", () => onNavigate("meet"));
}

function readLifterProfile() { return normalizeProfile(readJsonStorage(STORAGE_KEYS.lifterProfile, DEFAULT_PROFILE)); }
function normalizeProfile(input = {}) {
  const m = { ...DEFAULT_PROFILE, ...(input || {}) };
  return { version: PROFILE_VERSION, name: String(m.name || "").trim(), height: String(m.height || "").trim(), bodyweight: String(m.bodyweight || "").trim(), competitionSex: normalizeChoice(m.competitionSex, ["male", "female", ""]), residencePrefecture: normalizePrefecture(m.residencePrefecture), workSchoolPrefecture: normalizePrefecture(m.workSchoolPrefecture), gymPrefecture: normalizePrefecture(m.gymPrefecture), studentFederationStatus: normalizeChoice(m.studentFederationStatus, ["none", "student", "high_school", "unsure"], "none"), eventPreference: normalizeChoice(m.eventPreference, ["powerlifting", "bench", "both", "undecided"], "undecided"), equipmentPreference: normalizeChoice(m.equipmentPreference, ["classic", "equipped", "undecided"], "undecided"), createdAt: String(m.createdAt || ""), updatedAt: String(m.updatedAt || "") };
}
function profileFromForm(form, previousProfile) {
  const d = new FormData(form);
  const now = new Date().toISOString();
  return normalizeProfile({ ...previousProfile, name: d.get("name"), bodyweight: d.get("bodyweight"), competitionSex: d.get("competitionSex"), residencePrefecture: d.get("residencePrefecture"), createdAt: previousProfile.createdAt || now, updatedAt: now });
}
function hasRequiredProfile(profile) { return Boolean(profile.name && profile.competitionSex && profile.bodyweight && profile.residencePrefecture); }

function renderHero(title, copy) {
  return `<section class="hero-panel" aria-labelledby="screen-title"><p class="screen-label">HOME</p><h2 id="screen-title" class="screen-title">${escapeText(title)}</h2><p class="screen-copy">${escapeText(copy)}</p><button class="primary-action" type="button" data-open-plan>PLANを開く</button></section>`;
}
function renderProfileForm(profile, isRegistered) {
  return `<section class="settings-panel lifter-profile-panel" aria-label="Lifter profile onboarding"><div class="section-heading"><span>Lifter Profile</span><strong>競技者プロフィール作成</strong></div><p class="panel-note">入力は最小限です。登録候補は断定せず、現住所の都道府県から候補として表示します。</p><form class="settings-form lifter-profile-form" data-lifter-profile-form><label><span>名前 必須</span><input name="name" autocomplete="name" required value="${escapeAttribute(profile.name)}" /></label><label><span>大会出場区分 必須</span><select name="competitionSex" required>${option("", "選択してください", profile.competitionSex)}${option("male", "男子", profile.competitionSex)}${option("female", "女子", profile.competitionSex)}</select></label><label><span>体重 kg 必須</span><input name="bodyweight" type="number" inputmode="decimal" min="0" step="0.1" required value="${escapeAttribute(profile.bodyweight)}" /></label><p class="form-note" data-weight-class-preview>${escapeText(weightClassPreviewText(profile))}</p><label><span>現住所の都道府県 必須</span><select name="residencePrefecture" required>${prefectureOptions(profile.residencePrefecture)}</select></label><button class="primary-action" type="submit">${isRegistered ? "プロフィールを更新" : "Lifter Cardを作成"}</button>${isRegistered ? `<button class="secondary-action" type="button" data-cancel-profile-edit>戻る</button>` : ""}<p class="form-note" data-profile-status>この端末のlocalStorageに保存されます。登録候補は現住所から表示します。</p></form></section>`;
}
function renderLifterCard(profile) {
  const weightClass = bodyweightClassFor(profile);
  return `<section class="lifter-card" aria-label="Lifter card"><div class="lifter-card-header"><div><span>Lifter Card</span><strong>${escapeText(profile.name)}</strong></div><button class="text-action" type="button" data-edit-profile>編集</button></div><div class="profile-grid">${profileMetric("大会区分", labelFor(COMPETITION_SEX_LABELS, profile.competitionSex, "未設定"))}${profileMetric("体重", `${escapeText(profile.bodyweight)}kg`)}${profileMetric("体重階級", weightClass.label)}${profileMetric("現住所", profile.residencePrefecture || "未設定")}</div><p class="panel-note">${escapeText(weightClass.note)}</p><div class="association-block"><span>登録候補協会</span><ul class="association-list">${associationCandidates(profile).map((c) => `<li><strong>登録候補：${escapeText(c.association)}</strong><small>${escapeText(c.sources.join("、"))}に基づく候補です。</small></li>`).join("")}</ul><p>現住所に基づく候補です。最終判断はJPA公式案内、所属先、都道府県協会に確認してください。</p></div></section>`;
}

function renderTodayTraining(nextTraining, settings) {
  if (nextTraining.isComplete) return `<section class="detail-card today-training-card" aria-label="Today training"><div class="section-heading"><span>Today Training</span><strong>プログラム完了</strong></div><p>最終Week / DayまでLOGが保存されています。次のサイクルへ進む前にDATAで疲労とe1RMを確認してください。</p><button class="primary-action" type="button" data-open-plan>PLANを再生成</button></section>`;
  const segments = workSegmentsForItem(nextTraining.mainItem);
  const topSegment = segments.find((segment) => segment.workType === "top") || segments[0];
  const backoffSegment = segments.find((segment) => segment.workType === "backoff");
  const suggested = suggestedValuesForSegment(topSegment);
  return `<section class="detail-card today-training-card" aria-label="Today training"><div class="section-heading"><span>Today Training</span><strong>Week ${nextTraining.week} / Day ${nextTraining.day}</strong></div><div class="home-training-summary"><article><span>メイン種目</span><strong>${escapeText(liftLabel(nextTraining.mainItem?.lift))}</strong></article><article><span>Day</span><strong>${escapeText(nextTraining.dayTitle)}</strong></article></div><div class="work-row main-work"><div><span>${escapeText(workTypeLabel(topSegment.workType))}</span><strong>${escapeText(topSegment.title || nextTraining.dayTitle)}</strong></div><dl><div><dt>%1RM</dt><dd>${escapeText(topSegment.percent || "-")}</dd></div><div><dt>set</dt><dd>${escapeText(topSegment.sets || "-")}</dd></div><div><dt>rep</dt><dd>${escapeText(topSegment.reps || "-")}</dd></div><div><dt>RPE</dt><dd>${escapeText(topSegment.rpe || "-")}</dd></div></dl></div>${backoffSegment ? `<div class="work-row accessory-work"><div><span>${escapeText(workTypeLabel(backoffSegment.workType))}</span><strong>${escapeText(backoffSegment.title)}</strong></div><p>トップセット保存後、LOGでバックオフも別記録として保存できます。</p></div>` : ""}<div class="attention-list"><strong>今日の注意点</strong><p>${escapeText(topSegment.note || nextTraining.weekNote || "予定RPEとフォーム再現性を優先してください。")}</p></div><p class="panel-note">現在1RM: ${escapeText(currentMaxSummary(settings))}</p><button class="primary-action" type="button" data-send-to-log data-week="${escapeAttribute(nextTraining.week)}" data-day="${escapeAttribute(nextTraining.day)}" data-item-index="${escapeAttribute(nextTraining.itemIndex)}" data-work-type="${escapeAttribute(topSegment.workType)}" data-weight="${escapeAttribute(suggested.weight)}" data-reps="${escapeAttribute(suggested.reps)}" data-sets="${escapeAttribute(suggested.sets)}" data-rpe="${escapeAttribute(suggested.rpe)}">この予定をLOGに送る</button></section>`;
}
function renderLastLog(logs) {
  const lastLog = latestLog(logs);
  if (!lastLog) return `<section class="detail-card" aria-label="Last log"><div class="section-heading"><span>前回LOG</span><strong>まだ保存LOGがありません</strong></div><p>今日のメインセットを終えたら、LOGで重量・rep・RPEを残します。</p></section>`;
  return `<section class="detail-card" aria-label="Last log"><div class="section-heading"><span>前回LOG</span><strong>${escapeText(lastLog.date || "日付未設定")} / ${escapeText(liftLabel(lastLog.lift))}</strong></div><p>${escapeText(logSummary(lastLog))}</p></section>`;
}
function renderHomeJudgment(logs) {
  const recommendation = recommendationForLog(latestLog(logs));
  return `<section class="detail-card next-judgment-card" aria-label="Next judgment"><div class="section-heading"><span>次回判断</span><strong>${escapeText(recommendation.label)}</strong></div><p>${escapeText(recommendation.note)}</p></section>`;
}
function renderOfficialLinks() { return `<section class="official-links" aria-label="Official links"><div class="section-heading"><span>Official Links</span><strong>公式リンク</strong></div><div class="official-link-list">${OFFICIAL_LINKS.map((link) => `<a href="${escapeAttribute(link.href)}" target="_blank" rel="noopener noreferrer"><strong>${escapeText(link.title)}</strong><span>${escapeText(link.note)}</span></a>`).join("")}</div></section>`; }
function renderNextStep() { return `<section class="next-step-card" aria-label="Next step"><div class="section-heading"><span>Next Step</span><strong>次に確認すること</strong></div><div class="step-list"><a href="${escapeAttribute(OFFICIAL_LINKS[1].href)}" target="_blank" rel="noopener noreferrer"><strong>選手登録ページを確認</strong><span>現住所から表示された所属協会候補を確認します。</span></a><a href="${escapeAttribute(OFFICIAL_LINKS[2].href)}" target="_blank" rel="noopener noreferrer"><strong>ルール及び通達を確認</strong><span>白判定につながる最新ルールを確認します。</span></a><button type="button" data-open-meet><strong>MEETで大会日を設定</strong><span>大会予定を入れると準備の距離感が見えます。</span></button></div></section>`; }
function renderBuddyNote(text) { return `<section class="buddy-note" aria-label="Buddy note"><span>Buddy note</span><p>${escapeText(text)}</p></section>`; }
function associationCandidates(profile) { return profile.residencePrefecture ? [{ association: `${profile.residencePrefecture}パワーリフティング協会`, sources: ["現住所"] }] : []; }
function bodyweightClassFor(profile) {
  const bodyweight = Number.parseFloat(profile.bodyweight);
  if (!profile.competitionSex || !Number.isFinite(bodyweight) || bodyweight <= 0) return { label: "未判定", note: "大会出場区分と体重を入力すると、IPF/JPA基準の体重階級を自動表示します。" };
  const [limit, label, specialNote] = (BODYWEIGHT_CLASSES[profile.competitionSex] || []).find(([classLimit]) => bodyweight <= classLimit) || [];
  void limit;
  return { label, note: specialNote || `入力体重 ${formatKg(bodyweight)}kg に基づく目安です。正式な階級は大会当日の検量体重で決まります。` };
}
function weightClassPreviewText(profile) { const weightClass = bodyweightClassFor(profile); return `体重階級：${weightClass.label}。${weightClass.note}`; }
function currentMaxSummary(settings) { return Object.entries(settings.maxes).filter(([, value]) => Number(value) > 0).map(([lift, value]) => `${liftLabel(lift)} ${formatKg(value)}kg`).join(" / "); }
function logSummary(log) {
  const pieces = [log.plan?.week && log.plan?.day ? `Week ${log.plan.week} / Day ${log.plan.day}` : "", log.workType ? workTypeLabel(log.workType) : "", log.weight ? `${formatKg(log.weight)}kg` : "", log.reps ? `${log.reps}rep` : "", log.sets ? `${log.sets}set` : "", log.rpe ? `RPE ${log.rpe}` : "", log.e1rm ? `e1RM ${formatKg(log.e1rm)}kg` : ""].filter(Boolean);
  return pieces.join(" / ") || "保存LOGを確認してください。";
}
function profileMetric(label, value) { return `<article><span>${escapeText(label)}</span><strong>${escapeText(value)}</strong></article>`; }
function prefectureOptions(currentValue) { return [option("", "選択してください", currentValue), ...PREFECTURES.map((prefecture) => option(prefecture, prefecture, currentValue))].join(""); }
function option(value, label, currentValue) { return `<option value="${escapeAttribute(value)}" ${String(value) === String(currentValue) ? "selected" : ""}>${escapeText(label)}</option>`; }
function normalizePrefecture(value) { const normalizedValue = String(value || ""); return PREFECTURES.includes(normalizedValue) ? normalizedValue : ""; }
function normalizeChoice(value, allowedValues, fallbackValue = "") { const normalizedValue = String(value || ""); return allowedValues.includes(normalizedValue) ? normalizedValue : fallbackValue; }
function labelFor(labels, value, fallbackValue) { return labels[value] || fallbackValue; }
function escapeText(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function escapeAttribute(value) { return escapeText(value).replace(/"/g, "&quot;"); }
function today() { const now = new Date(); const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000); return localTime.toISOString().slice(0, 10); }
