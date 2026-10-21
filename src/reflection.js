import { waterTotal } from './water.js';

export function summarize(day, settings, now) {
  const desk = day.segments.filter((s) => s.kind === 'desk').map((s) => (s.end ?? now) - s.start);
  const deskMs = desk.length ? desk.reduce((a, b) => a + b, 0) : null;
  const longestMs = desk.length ? Math.max(...desk) : null;
  const bySource = { measured: 0, manual: 0, reported: 0 };
  for (const b of day.breaks) bySource[b.source] = (bySource[b.source] || 0) + 1;
  const breaks = day.breaks.length;
  const waterMl = day.water.length ? waterTotal(day.water) : null;

  let headline;
  if (breaks > 0) headline = `You took ${breaks} movement break${breaks === 1 ? '' : 's'} today. Small pauses add up.`;
  else if (deskMs) headline = 'No breaks logged yet today. One short pause is a good place to start tomorrow.';
  else headline = "Nothing tracked today, and that's okay. Daywell will be here when you need it.";

  let waterLine;
  if (waterMl == null) waterLine = 'No water logged today.';
  else if (waterMl >= settings.waterTargetMl) waterLine = `You logged ${waterMl.toLocaleString()} ml of water, reaching your ${settings.waterTargetMl.toLocaleString()} ml target.`;
  else waterLine = `You logged ${waterMl.toLocaleString()} ml of water.`;

  return { breaks, bySource, deskMs, longestMs, waterMl, headline, waterLine };
}
