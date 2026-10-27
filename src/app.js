import { canNudgeNow, createDay, normalizeDay, openSegment, reduce, status } from './engine.js';
import { DEFAULT_SETTINGS, clearData, exportBlob, loadData, saveData } from './store.js';
import { dateKey } from './time.js';
import { drinkScene } from './ui/buddy.js';
import { addWater, editWater, removeWater, validAmount, waterReminderDue } from './water.js';
import { addCalories, removeEntry, validKcal } from './habits.js';
import { createIdleSource } from './sources/idle.js';
import { createManualSource } from './sources/manual.js';
import { VIEWS, render } from './ui/render.js';
import { fillSettings, readSettings, syncOutputs } from './ui/settings.js';
import { detectDevice, readCapabilities } from './device.js';

const params = new URLSearchParams(location.search);
const speed = Math.min(600, Math.max(1, Number.parseInt(params.get('speed'), 10) || 1));

let data = loadData();
let settings = data.settings;
let day = normalizeDay(data.days[dateKey(Date.now())] ?? createDay(dateKey(Date.now()), Date.now()));
let source = null;
const device = detectDevice(window);
let swReg = null;
const ui = { editingWaterId: null, sourceError: null, toastTimer: null, cheerTimer: null, lastPromptAt: null, lastWaterReminderAt: null };

const engineSettings = () => ({ ...settings, speed });
const sourceLive = () => Boolean(source && source.kind === 'measured');

function persist() {
  data.settings = settings;
  data.days[day.date] = day;
  saveData(data);
}

const currentView = () => {
  const hash = location.hash.slice(1);
  if (hash === 'home' || hash === 'how') return 'home';
  return VIEWS.includes(hash) ? hash : 'today';
};

function draw() {
  const form = document.getElementById('settings-form');
  if (!form.__filled) {
    fillSettings(form, settings);
    form.__filled = true;
  }
  render({
    day, settings, speed, now: Date.now(), sourceLive: sourceLive(), ui,
    view: currentView(), device: { ...device, caps: readCapabilities(window) }, storageBytes: JSON.stringify(data).length,
  });
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

function askNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'default') return Promise.resolve();
  return Notification.requestPermission().catch(() => {}).finally(draw);
}

async function startDay() {
  go('today');
  const src = await connectMeasured(true);
  if (src) {
    dispatch({ type: 'start', mode: 'measured' });
    await beginMeasured(src);
  } else {
    useManual();
    dispatch({ type: 'start', mode: 'manual' });
  }
  askNotifications();
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

function notify(title, body, tag) {
  if (!document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
  const options = { body, tag, icon: 'assets/icon-192.png', badge: 'assets/icon-192.png' };
  if (swReg) swReg.showNotification(title, options).catch(() => {});
  else {
    try { new Notification(title, options); } catch { /* some mobile browsers only allow service-worker notifications */ }
  }
}

function notifyIfNeeded() {
  const p = day.prompt;
  if (!p.visible || p.shownAt === ui.lastPromptAt) return;
  ui.lastPromptAt = p.shownAt;
  notify('Time for a short break', 'A few minutes away from the desk would fit nicely now.', 'daywell-break');
}

function checkWaterReminder(t) {
  if (waterReminderDue(day, settings, t, { inWorkHours: (now) => canNudgeNow(now, engineSettings(), day), speed })) {
    day = { ...day, waterReminder: { visible: true, shownCount: day.waterReminder.shownCount + 1, lastAt: t } };
    persist();
  }
  const r = day.waterReminder;
  if (!r.visible || r.lastAt === ui.lastWaterReminderAt) return;
  ui.lastWaterReminderAt = r.lastAt;
  notify('Time for some water?', 'A glass of water would fit nicely now.', 'daywell-water');
}

const clearWaterReminder = (t) => ({ ...day.waterReminder, visible: false, lastAt: t });

const mockStart = Date.now() - (34 * 60 + 12) * 1000;
function tickMock() {
  const el = document.getElementById('mock-time');
  if (document.getElementById('welcome').hidden || !el) return;
  const s = Math.floor((Date.now() - mockStart) / 1000);
  el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function setupReveal() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    for (const el of items) el.classList.add('in');
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  for (const el of items) io.observe(el);
}

let ticks = 0;
function tick() {
  tickMock();
  const t = Date.now();
  rolloverIfNeeded(t);
  if (day.started) {
    day = reduce(day, { type: 'tick', t }, engineSettings());
    if (++ticks % 5 === 0) persist();
    checkWaterReminder(t);
  }
  notifyIfNeeded();
  draw();
}

function showToast(text, undo) {
  const el = document.getElementById('toast');
  const label = Object.assign(document.createElement('span'), { textContent: text });
  el.replaceChildren(label);
  if (undo) {
    const btn = Object.assign(document.createElement('button'), { className: 'btn-link', type: 'button', textContent: 'Undo' });
    btn.dataset.action = 'toast-undo';
    el.append(btn);
  }
  el.hidden = false;
  el.__undo = undo;
  clearTimeout(ui.toastTimer);
  ui.toastTimer = setTimeout(() => { el.hidden = true; el.__undo = null; }, 6000);
}

function logWater(ml) {
  const { entries, entry } = addWater(day.water, ml, Date.now());
  day = { ...day, water: entries, waterReminder: clearWaterReminder(entry.at) };
  persist();
  draw();
  cheer();
  showToast(`Logged ${entry.ml} ml of water.`, () => {
    day = { ...day, water: removeWater(day.water, entry.id) };
    persist();
    draw();
  });
}

function cheer() {
  const el = document.getElementById('water-cheer');
  clearTimeout(ui.cheerTimer);
  el.innerHTML = drinkScene().replace('class="buddy buddy-drink"', 'class="buddy buddy-drink once"');
  el.hidden = false;
  ui.cheerTimer = setTimeout(() => { el.hidden = true; el.innerHTML = ''; }, 7200);
}

function go(view) {
  if (currentView() === view && location.hash === `#${view}`) return;
  location.hash = view;
}

const actions = {
  start: () => (day.started ? go('today') : startDay()),
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
  'ignore-hours': () => dispatch({ type: 'ignoreHours', value: true }),
  'respect-hours': () => dispatch({ type: 'ignoreHours', value: false }),
  'enable-notifications': () => askNotifications(),
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
  'water-remind-log': () => logWater(250),
  'water-remind-dismiss': () => {
    day = { ...day, waterReminder: clearWaterReminder(Date.now()) };
    persist();
    draw();
  },
  'cal-delete': (el) => {
    const removed = day.calories.find((c) => c.id === el.dataset.id);
    day = { ...day, calories: removeEntry(day.calories, el.dataset.id) };
    persist();
    draw();
    showToast(`Removed ${removed.kcal} kcal.`, () => {
      day = { ...day, calories: [...day.calories, removed].sort((a, b) => a.at - b.at) };
      persist();
      draw();
    });
  },
  'toast-undo': () => {
    const el = document.getElementById('toast');
    el.__undo?.();
    el.hidden = true;
  },
  'open-settings': () => go('you'),
  step: (el) => {
    const input = document.getElementById('settings-form').elements[el.dataset.target];
    const next = Math.min(Number(input.max), Math.max(Number(input.min), (Number(input.value) || 0) + Number(el.dataset.delta)));
    input.value = String(next);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  },
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
    document.getElementById('settings-form').__filled = false;
    go('today');
    draw();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || !actions[el.dataset.action]) return;
  actions[el.dataset.action](el);
});

document.addEventListener('keydown', (e) => {
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

document.getElementById('cal-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const kcal = Number(e.target.kcal.value);
  const err = document.getElementById('cal-error');
  if (!validKcal(kcal)) {
    err.textContent = 'Enter an amount between 1 and 5,000 kcal.';
    return;
  }
  err.textContent = '';
  day = { ...day, calories: addCalories(day.calories, kcal, e.target.note.value, Date.now()).entries };
  e.target.reset();
  persist();
  draw();
});

document.getElementById('settings-form').addEventListener('input', (e) => syncOutputs(e.currentTarget));
document.getElementById('settings-form').addEventListener('submit', (e) => e.preventDefault());
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

window.addEventListener('hashchange', () => {
  draw();
  if (VIEWS.includes(location.hash.slice(1)) || location.hash === '#home') window.scrollTo({ top: 0, behavior: 'instant' });
});
setupReveal();

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('sw.js').then((reg) => { swReg = reg; }).catch(() => {});
}

const bootNow = Date.now();
if (day.started && bootNow - day.lastSeen > 10_000) day = reduce(day, { type: 'closeGap', t: bootNow }, engineSettings());
draw();
if (day.started) reattach();
setInterval(tick, 1000);
