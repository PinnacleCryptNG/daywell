import { MINUTE, inWorkHours } from './time.js';

export const UPGRADE_WINDOW_MS = 5 * MINUTE;

export function effective(settings) {
  const speed = settings.speed || 1;
  return {
    speed,
    thresholdMs: (settings.thresholdMin * MINUTE) / speed,
    minBreakMs: (settings.minBreakMin * MINUTE) / speed,
  };
}

export function createDay(date, now) {
  return {
    date,
    started: false,
    mode: null,
    segments: [],
    breaks: [],
    water: [],
    steps: [],
    calories: [],
    waterReminder: { visible: false, shownCount: 0, lastAt: null },
    prompt: { visible: false, shownCount: 0, shownAt: null, snoozeUntilMs: null, pausedForDay: false },
    notice: null,
    wrappedUp: false,
    lastSeen: now,
  };
}

export function normalizeDay(day) {
  const fresh = createDay(day.date, day.lastSeen);
  return { ...fresh, ...day, waterReminder: { ...fresh.waterReminder, ...day.waterReminder } };
}

let seq = 0;
const newId = (prefix, t) => `${prefix}-${t.toString(36)}-${(seq++).toString(36)}`;

export function openSegment(day) {
  const last = day.segments[day.segments.length - 1];
  return last && last.end == null ? last : null;
}

export function status(day) {
  if (!day.started) return 'not-started';
  const open = openSegment(day);
  if (!open) return 'stopped';
  return open.kind === 'desk' ? 'sitting' : 'away';
}

export function sittingMs(day, now) {
  const open = openSegment(day);
  return open && open.kind === 'desk' ? Math.max(0, now - open.start) : 0;
}

export function isBreakSegment(day, segment) {
  return segment.kind === 'away' && day.breaks.some((b) => b.start === segment.start && b.source !== 'reported');
}

function logBreak(d, start, end, source) {
  const upgradable = d.breaks.findIndex(
    (b) => b.source === 'reported' && start >= b.start && start - b.start <= UPGRADE_WINDOW_MS,
  );
  if (upgradable >= 0) d.breaks.splice(upgradable, 1);
  const br = { id: newId('b', end), start, end, durationMs: end - start, source };
  d.breaks.push(br);
  d.prompt.visible = false;
  d.prompt.snoozeUntilMs = null;
  return br;
}

function onActive(d, t, minBreakMs) {
  const open = openSegment(d);
  if (open?.kind === 'desk') return;
  if (open?.kind === 'away') {
    open.end = t;
    if (t - open.start >= minBreakMs) {
      const br = logBreak(d, open.start, t, open.source);
      d.notice = { kind: 'break', breakId: br.id, durationMs: br.durationMs, at: t };
      d.segments.push({ kind: 'desk', start: t, end: null, source: d.mode });
      return;
    }
    d.segments.pop();
    const prev = d.segments[d.segments.length - 1];
    if (prev && prev.kind === 'desk' && prev.end === open.start) prev.end = null;
    else d.segments.push({ kind: 'desk', start: open.start, end: null, source: d.mode });
    return;
  }
  d.segments.push({ kind: 'desk', start: t, end: null, source: d.mode });
}

function onAway(d, t, since) {
  const open = openSegment(d);
  if (open?.kind === 'away') return;
  let at;
  if (open?.kind === 'desk') {
    at = Math.min(t, Math.max(since, open.start));
    open.end = at;
    if (open.end === open.start) d.segments.pop();
  } else {
    const last = d.segments[d.segments.length - 1];
    at = Math.min(t, Math.max(since, last ? last.end : since));
  }
  d.segments.push({ kind: 'away', start: at, end: null, source: d.mode });
}

function maybePrompt(d, t, settings, thresholdMs) {
  const sitting = sittingMs(d, t);
  const p = d.prompt;
  if (!sitting || p.visible || p.pausedForDay) return;
  if (p.shownCount >= settings.dailyCap) return;
  if (!inWorkHours(t, settings)) return;
  if (sitting >= (p.snoozeUntilMs ?? thresholdMs)) {
    p.visible = true;
    p.shownCount += 1;
    p.shownAt = t;
  }
}

function mergeDeskAround(d, index) {
  const segs = d.segments;
  const canMerge = (a, b) => a && b && a.kind === 'desk' && b.kind === 'desk' && a.end === b.start;
  if (canMerge(segs[index], segs[index + 1])) {
    segs[index].end = segs[index + 1].end;
    segs.splice(index + 1, 1);
  }
  if (canMerge(segs[index - 1], segs[index])) {
    segs[index - 1].end = segs[index].end;
    segs.splice(index, 1);
  }
}

export function reduce(day, event, settings) {
  const d = structuredClone(day);
  const t = event.t;
  const { thresholdMs, minBreakMs, speed } = effective(settings);

  switch (event.type) {
    case 'start':
      d.started = true;
      d.mode = event.mode;
      if (!openSegment(d)) d.segments.push({ kind: 'desk', start: t, end: null, source: event.mode });
      break;
    case 'mode':
      d.mode = event.mode;
      break;
    case 'active':
      onActive(d, t, minBreakMs);
      break;
    case 'away':
      onAway(d, t, event.since ?? t);
      break;
    case 'tick':
      maybePrompt(d, t, settings, thresholdMs);
      break;
    case 'done': {
      const open = openSegment(d);
      if (open?.kind === 'desk') {
        open.end = t;
        if (open.end === open.start) d.segments.pop();
      }
      d.breaks.push({ id: newId('b', t), start: t, end: null, durationMs: null, source: 'reported' });
      d.segments.push({ kind: 'desk', start: t, end: null, source: d.mode });
      d.prompt.visible = false;
      d.prompt.snoozeUntilMs = null;
      d.notice = { kind: 'reported', at: t };
      break;
    }
    case 'snooze':
      d.prompt.visible = false;
      d.prompt.snoozeUntilMs = sittingMs(d, t) + (event.minutes * MINUTE) / speed;
      break;
    case 'pause':
      d.prompt.pausedForDay = true;
      d.prompt.visible = false;
      break;
    case 'resume':
      d.prompt.pausedForDay = false;
      break;
    case 'undoBreak': {
      const i = d.breaks.findIndex((b) => b.id === event.id);
      if (i < 0) break;
      const [br] = d.breaks.splice(i, 1);
      const si = d.segments.findIndex((s) => s.kind === 'away' && s.start === br.start);
      if (si >= 0) {
        d.segments[si].kind = 'desk';
        mergeDeskAround(d, si);
      }
      d.notice = null;
      break;
    }
    case 'dismissNotice':
      d.notice = null;
      break;
    case 'wrapUp':
      d.wrappedUp = event.value ?? true;
      break;
    case 'closeGap': {
      const open = openSegment(d);
      if (open) {
        const end = Math.max(open.start, d.lastSeen);
        open.end = end;
        if (open.end === open.start) d.segments.pop();
        else if (open.kind === 'away' && end - open.start >= minBreakMs) logBreak(d, open.start, end, open.source);
      }
      d.prompt.visible = false;
      d.notice = null;
      break;
    }
    default:
      throw new Error(`Unknown event: ${event.type}`);
  }

  if (event.type !== 'closeGap') d.lastSeen = Math.max(d.lastSeen || 0, t);
  return d;
}
