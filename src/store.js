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
  theme: 'system',
  buddyStyle: 'cartoon',
});

const LIMITS = {
  thresholdMin: [1, 240], minBreakMin: [1, 60], dailyCap: [1, 20], waterTargetMl: [250, 6000],
  waterReminderMin: [0, 240], waterReminderCap: [1, 12], stepGoal: [1000, 50000],
};
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ID = /^[\w-]{1,64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const numOrNull = (v) => v == null || num(v);

export function sanitizeSettings(raw) {
  const out = { ...DEFAULT_SETTINGS, workDays: [...DEFAULT_SETTINGS.workDays] };
  if (!isObj(raw)) return out;
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    if (num(raw[key]) && raw[key] >= min && raw[key] <= max) out[key] = Math.round(raw[key]);
  }
  for (const key of ['workStart', 'workEnd']) if (HHMM.test(raw[key])) out[key] = raw[key];
  if (Array.isArray(raw.workDays)) out.workDays = [...new Set(raw.workDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))];
  if (typeof raw.caloriesEnabled === 'boolean') out.caloriesEnabled = raw.caloriesEnabled;
  if (['system', 'light', 'dark'].includes(raw.theme)) out.theme = raw.theme;
  if (['cartoon', 'pixel'].includes(raw.buddyStyle)) out.buddyStyle = raw.buddyStyle;
  return out;
}

const entryRules = {
  segments: (e) => num(e.start) && numOrNull(e.end) && ['desk', 'away'].includes(e.kind),
  breaks: (e) => ID.test(e.id) && num(e.start) && numOrNull(e.end) && numOrNull(e.durationMs) && ['measured', 'manual', 'reported'].includes(e.source),
  water: (e) => ID.test(e.id) && num(e.at) && num(e.ml) && e.ml > 0 && e.ml <= 2000,
  steps: (e) => ID.test(e.id) && num(e.at) && Number.isInteger(e.total) && e.total >= 0 && e.total <= 100_000,
  calories: (e) => ID.test(e.id) && num(e.at) && num(e.kcal) && e.kcal > 0 && e.kcal <= 5000 && typeof e.note === 'string' && e.note.length <= 60,
};

export function sanitizeDay(key, raw) {
  if (!DATE.test(key) || !isObj(raw) || raw.date !== key) return null;
  const day = { ...raw };
  for (const [field, ok] of Object.entries(entryRules)) {
    day[field] = Array.isArray(raw[field]) ? raw[field].filter((e) => isObj(e) && ok(e)) : [];
  }
  day.started = raw.started === true;
  day.mode = ['measured', 'manual'].includes(raw.mode) ? raw.mode : null;
  day.wrappedUp = raw.wrappedUp === true;
  day.ignoreHours = raw.ignoreHours === true;
  day.lastSeen = num(raw.lastSeen) ? raw.lastSeen : Date.now();
  const p = isObj(raw.prompt) ? raw.prompt : {};
  day.prompt = { visible: p.visible === true, shownCount: num(p.shownCount) ? p.shownCount : 0, shownAt: numOrNull(p.shownAt) ? p.shownAt ?? null : null,
    snoozeUntilMs: numOrNull(p.snoozeUntilMs) ? p.snoozeUntilMs ?? null : null, pausedForDay: p.pausedForDay === true };
  const r = isObj(raw.waterReminder) ? raw.waterReminder : {};
  day.waterReminder = { visible: r.visible === true, shownCount: num(r.shownCount) ? r.shownCount : 0, lastAt: num(r.lastAt) ? r.lastAt : null };
  const n = raw.notice;
  day.notice = isObj(n) && ['break', 'reported'].includes(n.kind) && numOrNull(n.durationMs) && (n.breakId == null || ID.test(n.breakId))
    ? { kind: n.kind, durationMs: n.durationMs ?? null, breakId: n.breakId ?? null, at: num(n.at) ? n.at : null } : null;
  return day;
}

export function sanitizeData(raw) {
  const days = {};
  if (isObj(raw?.days)) {
    for (const [key, value] of Object.entries(raw.days)) {
      const day = sanitizeDay(key, value);
      if (day) days[key] = day;
    }
  }
  return { settings: sanitizeSettings(raw?.settings), days };
}

export function loadData(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(KEY);
    if (raw) {
      return sanitizeData(JSON.parse(raw));
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
