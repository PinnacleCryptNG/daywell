let seq = 0;

export const PRESETS_ML = [150, 250, 350, 500];
export const MAX_ENTRY_ML = 2000;

export function validAmount(ml) {
  return Number.isFinite(ml) && ml > 0 && ml <= MAX_ENTRY_ML;
}

export function addWater(entries, ml, at) {
  if (!validAmount(ml)) throw new RangeError('Amount must be between 1 and 2000 ml');
  const entry = { id: `w-${at.toString(36)}-${(seq++).toString(36)}`, at, ml: Math.round(ml) };
  return { entries: [...entries, entry], entry };
}

export function removeWater(entries, id) {
  return entries.filter((e) => e.id !== id);
}

export function editWater(entries, id, ml) {
  if (!validAmount(ml)) throw new RangeError('Amount must be between 1 and 2000 ml');
  return entries.map((e) => (e.id === id ? { ...e, ml: Math.round(ml) } : e));
}

export function waterTotal(entries) {
  return entries.reduce((sum, e) => sum + e.ml, 0);
}

export function waterReminderNextAt(day, settings, now, speed = 1) {
  if (!settings.waterReminderMin || !day.started) return null;
  const r = day.waterReminder;
  const since = Math.max(day.water.at(-1)?.at ?? 0, r.lastAt ?? 0, day.segments[0]?.start ?? now);
  return since + (settings.waterReminderMin * 60_000) / speed;
}

export function waterReminderDue(day, settings, now, { inWorkHours, speed = 1 }) {
  const r = day.waterReminder;
  const next = waterReminderNextAt(day, settings, now, speed);
  if (next == null || r.visible || day.prompt.visible) return false;
  if (r.shownCount >= settings.waterReminderCap || !inWorkHours(now, settings)) return false;
  return now >= next;
}

export function lastWaterAt(day) {
  return day.water.at(-1)?.at ?? null;
}
