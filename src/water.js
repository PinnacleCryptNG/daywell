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
