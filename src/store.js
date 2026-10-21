const KEY = 'daywell:v1';

export const DEFAULT_SETTINGS = Object.freeze({
  thresholdMin: 50,
  minBreakMin: 2,
  workStart: '09:00',
  workEnd: '17:00',
  workDays: [1, 2, 3, 4, 5],
  dailyCap: 8,
  waterTargetMl: 2000,
  stepGoal: 10000,
  caloriesEnabled: false,
  waterReminderMin: 90,
  waterReminderCap: 4,
});

export function loadData(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { settings: { ...DEFAULT_SETTINGS, ...parsed.settings }, days: parsed.days || {} };
    }
  } catch {
    /* corrupted storage falls back to a fresh start */
  }
  return { settings: { ...DEFAULT_SETTINGS }, days: {} };
}

export function saveData(data, storage = globalThis.localStorage) {
  try {
    storage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearData(storage = globalThis.localStorage) {
  storage.removeItem(KEY);
}

export function exportBlob(data) {
  return new Blob([JSON.stringify({ app: 'daywell', exportedAt: new Date().toISOString(), ...data }, null, 2)], {
    type: 'application/json',
  });
}
