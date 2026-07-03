import { readStorageValue, writeStorageValue } from "./storage.js";

const logDraftPrefix = "platformBuddy.logDraft.";

export function getLogDraftValue(fieldKey, fallbackValue) {
  return readStorageValue(`${logDraftPrefix}${fieldKey}`, fallbackValue);
}

export function setLogDraftValue(fieldKey, value) {
  writeStorageValue(`${logDraftPrefix}${fieldKey}`, value);
}
