import { createDay, openSegment, reduce, status } from './engine.js';
import { DEFAULT_SETTINGS, clearData, exportBlob, loadData, saveData } from './store.js';
import { dateKey } from './time.js';
import { addWater, editWater, removeWater, validAmount } from './water.js';
import { createIdleSource } from './sources/idle.js';
import { createManualSource } from './sources/manual.js';
import { render } from './ui/render.js';
import { fillSettings, measureExplain, readSettings } from './ui/settings.js';

const params = new URLSearchParams(location.search);
const speed = Math.min(600, Math.max(1, Number.parseInt(params.get('speed'), 10) || 1));

let data = loadData();
let settings = data.settings;
let day = data.days[dateKey(Date.now())] ?? createDay(dateKey(Date.now()), Date.now());
let source = null;
const ui = { editingWaterId: null, sourceError: null, toastTimer: null, lastPromptAt: null };

const engineSettings = () => ({ ...settings, speed });
const sourceLive = () => Boolean(source && source.kind === 'measured');

function persist() {
  data.settings = settings;
  data.days[day.date] = day;
  saveData(data);
}

function draw() {
  render({ day, settings, speed, now: Date.now(), sourceLive: sourceLive(), ui });
  const form = document.getElementById('settings-form');
  if (!document.getElementById('settings').hidden) {
    document.getElementById('measure-explain').textContent = measureExplain(day.mode, sourceLive(), ui.sourceError);
    document.getElementById('measure-actions').innerHTML = day.mode === 'measured' && sourceLive()
      ? '<button class="btn btn-soft" type="button" data-action="use-manual">Switch to manual mode</button>'
      : '<button class="btn btn-soft" type="button" data-action="retry-measured">Try measured mode</button>';
  } else if (!form.__filled) {
    fillSettings(form, settings);
    form.__filled = true;
  }
}

function dispatch(event) {
  day = reduce(day, { t: Date.now(), ...event }, engineSettings());
  persist();
  draw();
}

function onSignal(signal) {
  rolloverIfNeeded(signal.t);
  dispatch(signal);
}

async function connectMeasured(request) {
  try {
    const src = await createIdleSource({ request });
    ui.sourceError = null;
    return src;
  } catch (err) {
    ui.sourceError = err.code || 'unsupported';
    return null;
  }
}

function useManual() {
  source?.stop();
  source = createManualSource();
}

async function beginMeasured(src) {
  source?.stop();
  source = src;
  try {
    await src.start(onSignal);
  } catch {
    ui.sourceError = 'unsupported';
    useManual();
    dispatch({ type: 'mode', mode: 'manual' });
  }
}

async function startDay() {
  const src = await connectMeasured(true);
  if (src) {
    dispatch({ type: 'start', mode: 'measured' });
    await beginMeasured(src);
  } else {
    useManual();
    dispatch({ type: 'start', mode: 'manual' });
  }
}

async function reattach() {
  if (day.mode === 'measured') {
    const src = await connectMeasured(false);
    if (src) await beginMeasured(src);
    else if (ui.sourceError === 'needs-gesture') ui.sourceError = null;
    else {
      useManual();
      dispatch({ type: 'mode', mode: 'manual' });
    }
  } else {
    useManual();
    if (status(day) === 'stopped') dispatch({ type: 'active' });
  }
  draw();
}

function rolloverIfNeeded(t) {
  const key = dateKey(t);
  if (key === day.date) return;
  const wasKind = openSegment(day)?.kind;
  day = reduce(day, { type: 'closeGap', t }, engineSettings());
  persist();
  const next = createDay(key, t);
  next.started = day.started;
  next.mode = day.mode;
  day = next;
  if (day.started && wasKind) day = reduce(day, { type: wasKind === 'desk' ? 'active' : 'away', t }, engineSettings());
  persist();
}

function notifyIfNeeded() {
  const p = day.prompt;
  if (!p.visible || p.shownAt === ui.lastPromptAt) return;
  ui.lastPromptAt = p.shownAt;
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    new Notification('Time for a short break', { body: 'Daywell: a few minutes away from the desk would fit nicely now.', tag: 'daywell-break', icon: 'assets/icon.svg' });
  }
}

let ticks = 0;
function tick() {
  const t = Date.now();
  rolloverIfNeeded(t);
  if (day.started) {
    day = reduce(day, { type: 'tick', t }, engineSettings());
    if (++ticks % 5 === 0) persist();
  }
  notifyIfNeeded();
  draw();
}

function showToast(text, undo) {
  const el = document.getElementById('toast');
  el.innerHTML = `<span>${text}</span>${undo ? '<button class="btn-link" type="button" data-action="toast-undo">Undo</button>' : ''}`;
  el.hidden = false;
  el.__undo = undo;
  clearTimeout(ui.toastTimer);
  ui.toastTimer = setTimeout(() => { el.hidden = true; el.__undo = null; }, 6000);
}

function logWater(ml) {
  const { entries, entry } = addWater(day.water, ml, Date.now());
  day = { ...day, water: entries };
  persist();
  draw();
  showToast(`Logged ${entry.ml} ml of water.`, () => {
    day = { ...day, water: removeWater(day.water, entry.id) };
    persist();
    draw();
  });
}

function openSettings() {
  const drawer = document.getElementById('settings');
  fillSettings(document.getElementById('settings-form'), settings);
  drawer.hidden = false;
  draw();
  drawer.querySelector('select, input, button')?.focus();
}

function closeSettings() {
  document.getElementById('settings').hidden = true;
  document.getElementById('open-settings').focus();
}

const actions = {
  start: () => startDay(),
  'manual-away': () => dispatch({ type: 'away' }),
  'manual-active': () => dispatch({ type: 'active' }),
  'resume-measuring': async () => {
    const src = await connectMeasured(true);
    if (src) await beginMeasured(src);
    else { useManual(); dispatch({ type: 'mode', mode: 'manual' }); }
    draw();
  },
  'retry-measured': async () => {
    const src = await connectMeasured(true);
    if (src) {
      dispatch({ type: 'mode', mode: 'measured' });
      await beginMeasured(src);
    }
    draw();
  },
  'use-manual': () => {
    useManual();
    dispatch({ type: 'mode', mode: 'manual' });
  },
  done: () => dispatch({ type: 'done' }),
  snooze: (el) => dispatch({ type: 'snooze', minutes: Number(el.dataset.min) }),
  pause: () => dispatch({ type: 'pause' }),
  resume: () => dispatch({ type: 'resume' }),
  'undo-break': (el) => dispatch({ type: 'undoBreak', id: el.dataset.id }),
  'dismiss-notice': () => dispatch({ type: 'dismissNotice' }),
  'wrap-up': () => { dispatch({ type: 'wrapUp', value: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  unwrap: () => dispatch({ type: 'wrapUp', value: false }),
  'water-add': (el) => logWater(Number(el.dataset.ml)),
  'water-edit': (el) => { ui.editingWaterId = el.dataset.id; draw(); document.getElementById(`edit-${el.dataset.id}`)?.focus(); },
  'water-cancel': () => { ui.editingWaterId = null; draw(); },
  'water-save': (el) => {
    const ml = Number(document.getElementById(`edit-${el.dataset.id}`).value);
    if (!validAmount(ml)) return;
    day = { ...day, water: editWater(day.water, el.dataset.id, ml) };
    ui.editingWaterId = null;
    persist();
    draw();
  },
  'water-delete': (el) => {
    const removed = day.water.find((w) => w.id === el.dataset.id);
    day = { ...day, water: removeWater(day.water, el.dataset.id) };
    persist();
    draw();
    showToast(`Removed ${removed.ml} ml.`, () => {
      day = { ...day, water: [...day.water, removed].sort((a, b) => a.at - b.at) };
      persist();
      draw();
    });
  },
  'toast-undo': () => {
    const el = document.getElementById('toast');
    el.__undo?.();
    el.hidden = true;
  },
  'open-settings': () => openSettings(),
  'close-settings': () => closeSettings(),
  export: () => {
    persist();
    const url = URL.createObjectURL(exportBlob(data));
    const a = Object.assign(document.createElement('a'), { href: url, download: `daywell-${day.date}.json` });
    a.click();
    URL.revokeObjectURL(url);
  },
  'delete-all': () => {
    if (!confirm('Delete all Daywell data stored in this browser? This cannot be undone.')) return;
    source?.stop();
    source = null;
    clearData();
    data = { settings: { ...DEFAULT_SETTINGS }, days: {} };
    settings = data.settings;
    day = createDay(dateKey(Date.now()), Date.now());
    closeSettings();
    draw();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || !actions[el.dataset.action]) return;
  actions[el.dataset.action](el);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('settings').hidden) closeSettings();
  if (e.key === 'Enter' && e.target.matches('.list input')) {
    e.target.closest('li').querySelector('[data-action=water-save]')?.click();
  }
});

document.getElementById('water-custom').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = e.target.ml;
  const ml = Number(input.value);
  const err = document.getElementById('water-error');
  if (!validAmount(ml)) {
    err.textContent = 'Enter an amount between 1 and 2,000 ml.';
    return;
  }
  err.textContent = '';
  input.value = '';
  logWater(ml);
});

document.getElementById('settings-form').addEventListener('change', (e) => {
  settings = readSettings(e.currentTarget, settings);
  persist();
  draw();
});

const flush = () => {
  if (day.started) day = { ...day, lastSeen: Date.now() };
  persist();
};
document.addEventListener('visibilitychange', () => document.hidden && flush());
window.addEventListener('pagehide', flush);

const bootNow = Date.now();
if (day.started && bootNow - day.lastSeen > 10_000) day = reduce(day, { type: 'closeGap', t: bootNow }, engineSettings());
draw();
if (day.started) reattach();
setInterval(tick, 1000);
