export const STORAGE_KEYS = {
  activeView: "platformBuddy.activeView"
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
