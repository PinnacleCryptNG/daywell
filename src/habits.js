let seq = 0;
const newId = (prefix, at) => `${prefix}-${at.toString(36)}-${(seq++).toString(36)}`;

export const MAX_STEPS = 100_000;
export const MAX_ENTRY_KCAL = 5000;

export function validSteps(total) {
  return Number.isInteger(total) && total >= 0 && total <= MAX_STEPS;
}

export function setSteps(entries, total, at) {
  if (!validSteps(total)) throw new RangeError(`Steps must be a whole number between 0 and ${MAX_STEPS}`);
  const entry = { id: newId('s', at), at, total };
  return { entries: [...entries, entry], entry };
}

export function latestSteps(entries) {
  return entries.length ? entries[entries.length - 1] : null;
}

export function removeEntry(entries, id) {
  return entries.filter((e) => e.id !== id);
}

export function validKcal(kcal) {
  return Number.isFinite(kcal) && kcal > 0 && kcal <= MAX_ENTRY_KCAL;
}

export function addCalories(entries, kcal, note, at) {
  if (!validKcal(kcal)) throw new RangeError(`Calories must be between 1 and ${MAX_ENTRY_KCAL}`);
  const entry = { id: newId('c', at), at, kcal: Math.round(kcal), note: String(note ?? '').trim().slice(0, 60) };
  return { entries: [...entries, entry], entry };
}

export function caloriesTotal(entries) {
  return entries.length ? entries.reduce((sum, e) => sum + e.kcal, 0) : null;
}
