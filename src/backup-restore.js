import { readStorageValue, STORAGE_KEYS, writeStorageValue } from "./storage.js";

const BACKUP_VERSION = 1;
const BACKUP_KIND = "platform-buddy-v2.localStorageBackup";
const ALLOWED_KEYS = Object.values(STORAGE_KEYS);
const KEY_LABELS = {
  [STORAGE_KEYS.activeView]: "表示中画面",
  [STORAGE_KEYS.logDraft]: "LOG下書き",
  [STORAGE_KEYS.meetMemo]: "MEETメモ",
  [STORAGE_KEYS.meetAttemptDraft]: "試技ドラフト",
  [STORAGE_KEYS.meetSettings]: "大会設定",
  [STORAGE_KEYS.meetChecklist]: "MEETチェックリスト",
  [STORAGE_KEYS.buddyMethodSettings]: "Buddy Method設定",
  [STORAGE_KEYS.trainingLogs]: "保存LOG",
  [STORAGE_KEYS.lifterProfile]: "Lifter Profile"
};

let statusText = "";
let pendingImport = null;

export function renderBackupRestore() {
  return `
    <section class="detail-card" aria-label="Backup and restore">
      <div class="section-heading">
        <span>Backup / Restore</span>
        <strong>端末データをJSONで保管</strong>
      </div>
      <p>この端末のPlatform Buddy保存データだけを書き出します。読み込み時は既知のキーだけを上書きし、含まれないキーはそのまま残します。</p>
      <div class="settings-form">
        <button class="secondary-action" type="button" data-export-backup>JSONバックアップを保存</button>
        <label>
          <span>バックアップJSONを選択</span>
          <input type="file" accept="application/json,.json" data-import-backup />
        </label>
        <p class="form-note">${escapeText(statusText || "削除や初期化は行いません。インポートは確認ボタンを押した時だけ実行します。")}</p>
      </div>
      ${renderImportPreview()}
    </section>
  `;
}

export function bindBackupRestore(app, { onRefresh }) {
  app.querySelector("[data-export-backup]")?.addEventListener("click", () => {
    downloadBackup(buildBackup());
    statusText = "JSONバックアップを書き出しました。";
    pendingImport = null;
    onRefresh();
  });

  app.querySelector("[data-import-backup]")?.addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    try {
      pendingImport = parseBackup(await file.text());
      statusText = `${pendingImport.keys.length}件の保存キーを読み込めます。内容を確認してから実行してください。`;
    } catch (error) {
      pendingImport = null;
      statusText = error instanceof Error ? error.message : "JSONを読み込めませんでした。";
    }

    onRefresh();
  });

  app.querySelector("[data-run-import]")?.addEventListener("click", () => {
    if (!pendingImport) return;

    pendingImport.keys.forEach(({ key, value }) => writeStorageValue(key, value));
    statusText = `${pendingImport.keys.length}件を復元しました。HOME/LOG/DATA/MEETを開き直して確認してください。`;
    pendingImport = null;
    onRefresh();
  });

  app.querySelector("[data-cancel-import]")?.addEventListener("click", () => {
    pendingImport = null;
    statusText = "インポートをキャンセルしました。保存データは変更していません。";
    onRefresh();
  });
}

function buildBackup() {
  const keys = Object.fromEntries(ALLOWED_KEYS
    .map((key) => [key, readStorageValue(key, null)])
    .filter(([, value]) => value !== null));

  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    keys
  };
}

function parseBackup(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Platform BuddyのバックアップJSONではありません。");
  }

  const rawKeys = parsed.keys;
  if (!rawKeys || typeof rawKeys !== "object" || Array.isArray(rawKeys)) {
    throw new Error("バックアップ内に復元できる保存キーがありません。");
  }

  const keys = Object.entries(rawKeys)
    .filter(([key, value]) => ALLOWED_KEYS.includes(key) && typeof value === "string")
    .map(([key, value]) => ({ key, value }));

  if (!keys.length) {
    throw new Error("既知のPlatform Buddy保存キーが見つかりませんでした。");
  }

  return {
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : "",
    keys
  };
}

function renderImportPreview() {
  if (!pendingImport) return "";

  return `
    <div class="settings-panel" aria-label="Import preview">
      <div class="section-heading">
        <span>Import Preview</span>
        <strong>${pendingImport.keys.length}件</strong>
      </div>
      <p class="form-note">${escapeText(pendingImport.exportedAt ? `作成日時: ${pendingImport.exportedAt}` : "作成日時は未記録です。")}</p>
      <ul class="association-list">
        ${pendingImport.keys.map(({ key }) => `<li><strong>${escapeText(KEY_LABELS[key] || key)}</strong><small>${escapeText(key)}</small></li>`).join("")}
      </ul>
      <button class="primary-action" type="button" data-run-import>このJSONを復元する</button>
      <button class="secondary-action" type="button" data-cancel-import>キャンセル</button>
    </div>
  `;
}

function downloadBackup(backup) {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `platform-buddy-v2-backup-${dateStamp()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function escapeText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
