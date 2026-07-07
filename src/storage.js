export const STORAGE_KEYS = {
  activeView: "platformBuddy.activeView",
  logDraft: "platformBuddy.logDraft",
  meetMemo: "platformBuddy.meetMemo",
  meetAttemptDraft: "platformBuddy.meetAttemptDraft",
  meetSettings: "platformBuddy.meetSettings",
  meetChecklist: "platformBuddy.meetChecklist",
  buddyMethodSettings: "platformBuddy.buddyMethodSettings",
  trainingLogs: "platformBuddy.trainingLogs",
  lifterProfile: "platformBuddy.lifterProfile"
};

export function readStorageValue(key, fallbackValue) {
  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ?? fallbackValue;
  } catch {
    return fallbackValue;
  }
}

export function writeStorageValue(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Keep the app usable when localStorage is unavailable.
  }
}

export function readJsonStorage(key, fallbackValue) {
  const fallbackClone = structuredCloneSafe(fallbackValue);

  try {
    const storedValue = window.localStorage.getItem(key);
    if (!storedValue) return fallbackClone;

    const parsedValue = JSON.parse(storedValue);
    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return fallbackClone;
    }

    return parsedValue;
  } catch {
    return fallbackClone;
  }
}

export function writeJsonStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the app usable when localStorage is unavailable.
  }
}

export function readArrayStorage(key, fallbackValue = []) {
  const fallbackClone = structuredCloneSafe(fallbackValue);

  try {
    const storedValue = window.localStorage.getItem(key);
    if (!storedValue) return fallbackClone;

    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? parsedValue : fallbackClone;
  } catch {
    return fallbackClone;
  }
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}
