import { canNudgeNow, effective, isBreakSegment, openSegment, sittingMs, status } from '../engine.js';
import { formatClock, formatDuration, formatTimer, inWorkHours, MINUTE } from '../time.js';
import { lastWaterAt, waterReminderNextAt, waterTotal } from '../water.js';
import { caloriesTotal } from '../habits.js';
import { summarize } from '../reflection.js';
import { deviceAdvice, notificationAdvice } from '../device.js';
import { measureExplain, rhythmSummary } from './settings.js';

const $ = (id) => document.getElementById(id);
const RING = 2 * Math.PI * 52;
const MINI = 2 * Math.PI * 44;
export const VIEWS = ['today', 'move', 'water', 'you'];

const SUGGESTIONS = [
  'Take a 3-minute walk, maybe refill your water on the way.',
  'Stand up and roll your shoulders for 2 minutes.',
  'Walk to a window and rest your eyes on something far away.',
  'Stretch your legs with a slow lap of the room.',
];

const SOURCE_LABEL = { measured: 'Measured · this computer', manual: 'Manual', reported: 'Reported' };

function patch(el, html) {
  if (el.__html !== html) {
    el.innerHTML = html;
    el.__html = html;
  }
}

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = (name) => `<svg class="i" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const chip = (source) => `<span class="chip chip-${source}">${SOURCE_LABEL[source]}</span>`;

export function render(ctx) {
  const { day } = ctx;
  const landing = !day.started || ctx.view === 'home';
  $('welcome').hidden = !landing;
  $('app').hidden = landing;
  renderChrome(ctx, landing);
  if (landing) {
    renderWelcome(ctx);
    return;
  }
  renderHero(ctx);
  renderGlance(ctx);
  renderScreen(ctx);
  renderTimeline(ctx);
  renderBreaks(ctx);
  renderWaterReminder(ctx);
  renderWater(ctx);
  renderCalories(ctx);
  renderReflection(ctx);
  if (ctx.view === 'you') renderYou(ctx);
}

function renderChrome(ctx, landing) {
  const { day, view, settings } = ctx;
  document.documentElement.dataset.theme = settings.theme;
  $('tabs').hidden = landing;
  for (const a of document.querySelectorAll('[data-tab]')) {
    if (a.dataset.tab === view) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  for (const v of document.querySelectorAll('[data-view]')) v.hidden = v.dataset.view !== view;
  const demo = $('demo-banner');
  demo.hidden = ctx.speed === 1;
  if (ctx.speed !== 1) {
    patch(demo, `Demo speed ×${ctx.speed}: break thresholds run ${ctx.speed}× faster for recording. Work hours are ignored. Idle detection and durations are real. <a href="./">Exit demo speed</a>`);
  }
  const promptUp = day.prompt.visible;
  const waterUp = day.waterReminder?.visible;
  document.title = promptUp ? '• Time for a short break · Daywell' : waterUp ? '• Time for some water · Daywell' : 'Daywell';
}

function renderWelcome(ctx) {
  for (const b of document.querySelectorAll('.cta-start')) b.textContent = ctx.day.started ? 'Open my day' : 'Start my day';
  const a = deviceAdvice(ctx.device);
  patch($('welcome-device'), `${icon(a.mode === 'measured' ? 'check' : 'device')}<div><strong>${esc(a.where)} · ${a.headline}</strong><p>${esc(a.detail)}</p></div>`);
  const notes = [];
  if (a.mode === 'measured') notes.push('Your browser will ask to let Daywell know when you\'re idle.');
  if (ctx.device.caps.notifications === 'default') notes.push('It may also ask whether Daywell can show reminders as notifications.');
  notes.push('You can say no to either.');
  $('welcome-note').textContent = a.mode === 'measured' || ctx.device.caps.notifications === 'default' ? notes.join(' ') : 'Nothing to allow: Daywell works without permissions here.';
}

function greeting(now) {
  const h = new Date(now).getHours();
  const part = h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return `${part} · ${new Date(now).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}`;
}

function renderHero(ctx) {
  const { day, settings, now, speed, sourceLive, ui } = ctx;
  const { thresholdMs, minBreakMs } = effective({ ...settings, speed });
  const st = status(day);
  const open = openSegment(day);
  const sit = sittingMs(day, now);
  const wrap = document.querySelector('.ring-wrap');

  let value = '—';
  let label = 'not tracking';
  let progress = 0;
  if (st === 'sitting') {
    value = formatTimer(sit);
    label = 'sitting';
    progress = Math.min(1, sit / thresholdMs);
  } else if (st === 'away') {
    value = formatTimer(now - open.start);
    label = 'away';
    progress = Math.min(1, (now - open.start) / minBreakMs);
  }
  $('ring-value').textContent = value;
  $('ring-label').textContent = label;
  $('ring-fill').style.strokeDashoffset = String(RING * (1 - progress));
  $('ring-fill').style.opacity = progress > 0 ? '1' : '0';
  wrap.classList.toggle('is-away', st === 'away');
  wrap.classList.toggle('is-over', st === 'sitting' && sit >= thresholdMs);
  $('hero-greeting').textContent = greeting(now);

  const titles = { sitting: 'At your desk', away: 'Away from your desk', stopped: 'Not tracking right now' };
  $('hero-title').textContent = titles[st];

  const p = day.prompt;
  let line;
  let lineAction = '';
  if (st === 'away') {
    const left = minBreakMs - (now - open.start);
    line = left > 0
      ? `Away since ${formatClock(open.start)}. It counts as a break after ${formatDuration(minBreakMs)}.`
      : `Away since ${formatClock(open.start)}. This counts as a break; it'll be logged when you're back.`;
  } else if (st === 'stopped') {
    line = day.mode === 'measured' && !sourceLive
      ? 'Daywell needs a click to resume measuring after the page was reopened.'
      : 'Let Daywell know when you are at your desk.';
  } else if (p.pausedForDay) {
    line = 'Break suggestions are paused for today.';
    lineAction = '<button class="btn-link" type="button" data-action="resume">Resume nudges</button>';
  } else if (!canNudgeNow(now, { ...settings, speed }, day)) {
    line = `Outside your work hours (${settings.workStart}–${settings.workEnd}), so break and water reminders are on hold. Desk time is still measured.`;
    lineAction = '<span class="hero-inline"><button class="btn btn-soft btn-sm" type="button" data-action="ignore-hours">Remind me anyway today</button> <button class="btn-link" type="button" data-action="open-settings">Change hours</button></span>';
  } else if (p.shownCount >= settings.dailyCap && !p.visible) {
    line = `You've had all ${settings.dailyCap} nudges for today. Daywell will stay quiet.`;
  } else if (p.visible) {
    line = 'A short break would fit nicely now.';
  } else if (p.snoozeUntilMs != null) {
    line = `Snoozed. Next suggestion in ${formatDuration(Math.max(0, p.snoozeUntilMs - sit))}.`;
  } else {
    line = `Next break suggestion in ${formatDuration(Math.max(0, thresholdMs - sit))} of sitting.`;
    if (day.ignoreHours && speed === 1 && !inWorkHours(now, settings)) lineAction = '<button class="btn-link" type="button" data-action="respect-hours">Hold reminders outside work hours</button>';
  }
  patch($('hero-status'), `${line} ${lineAction}`);

  const sourceText = day.mode === 'manual'
    ? chip('manual')
    : sourceLive ? chip('measured') : '<span class="chip">Not tracked</span>';
  patch($('hero-meta'), `${sourceText}<span class="fineprint">Break after ${settings.thresholdMin} min${speed !== 1 ? ` (×${speed} demo)` : ''}</span>`);

  let actions = '';
  if (day.mode === 'manual') {
    actions = st === 'sitting'
      ? `<button class="btn btn-soft" type="button" data-action="manual-away">${icon('move')}I'm stepping away</button>`
      : `<button class="btn btn-glow" type="button" data-action="manual-active">${icon('screen')}I'm at my desk</button>`;
  } else if (!sourceLive) {
    actions = `<button class="btn btn-glow" type="button" data-action="resume-measuring">${icon('clock')}Resume measuring</button>`;
  }
  if (ui.sourceError === 'denied') {
    actions += '<p class="fineprint">Idle permission was declined, so Daywell is in manual mode. You can try measured mode again under You.</p>';
  } else if (ui.sourceError === 'unsupported' && day.mode === 'manual') {
    actions += `<p class="fineprint">${ctx.device.form === 'desktop' ? `${esc(ctx.device.browser)} can't share idle signals, so tap when you step away and come back.` : 'This device can\'t share idle signals, so tap when you step away and come back.'}</p>`;
  }
  patch($('hero-actions'), actions);

  const promptEl = $('prompt');
  promptEl.hidden = !p.visible;
  if (p.visible) {
    const tip = SUGGESTIONS[(p.shownCount - 1 + SUGGESTIONS.length) % SUGGESTIONS.length];
    patch(promptEl, `
      <div class="nudge-head"><span class="ico ico-blue">${icon('move')}</span>
        <div><h3>You've been sitting for ${formatDuration(sit)}.</h3><p>${tip}</p></div></div>
      <div class="nudge-actions">
        <button class="btn btn-primary" type="button" data-action="done">${icon('check')}Done</button>
        <button class="btn btn-soft btn-sm" type="button" data-action="snooze" data-min="10">Snooze 10 min</button>
        <button class="btn btn-soft btn-sm" type="button" data-action="snooze" data-min="30">30 min</button>
        <button class="btn btn-ghost btn-sm" type="button" data-action="pause">${icon('pause')}Pause today</button>
      </div>`);
  }

  const n = day.notice;
  let notice = '';
  if (n?.kind === 'break') {
    notice = `<div class="nudge"><div class="nudge-head"><span class="ico ico-cyan">${icon('break')}</span>
      <div><h3>Welcome back.</h3><p>Break logged: ${formatDuration(n.durationMs)} away.</p></div></div>
      <div class="nudge-actions"><button class="btn btn-soft btn-sm" type="button" data-action="undo-break" data-id="${esc(n.breakId)}">Undo, I was here</button>
      <button class="btn-link" type="button" data-action="dismiss-notice">Dismiss</button></div></div>`;
  } else if (n?.kind === 'reported') {
    notice = `<div class="nudge"><div class="nudge-head"><span class="ico ico-cyan">${icon('sparkle')}</span>
      <div><h3>Enjoy the break.</h3><p>${day.mode === 'measured' ? 'If you step away, Daywell will measure how long.' : 'Logged as reported.'}</p></div></div>
      <div class="nudge-actions"><button class="btn-link" type="button" data-action="dismiss-notice">Dismiss</button></div></div>`;
  }
  patch($('notice'), notice);
}

function renderTimeline(ctx) {
  const { day, now, speed } = ctx;
  const first = day.segments[0]?.start ?? now;
  const minSpan = (60 * MINUTE) / speed;
  const start = first;
  const end = Math.max(now, start + minSpan);
  const span = end - start;
  let desk = 0;
  let breaks = 0;
  let covered = 0;
  const bars = day.segments.map((s) => {
    const sEnd = s.end ?? now;
    const len = sEnd - s.start;
    covered += len;
    let cls = 'tl-desk';
    if (s.kind === 'desk') desk += len;
    else if (isBreakSegment(day, s)) { cls = 'tl-break'; breaks += 1; }
    else cls = 'tl-away';
    const left = ((s.start - start) / span) * 100;
    const width = Math.max(0.4, (len / span) * 100);
    return `<div class="tl-seg ${cls}" style="left:${left.toFixed(3)}%;width:${width.toFixed(3)}%"></div>`;
  }).join('');
  const nowLeft = ((now - start) / span) * 100;
  const untracked = Math.max(0, (now - start) - covered);
  const closedNote = untracked >= 60_000
    ? `<p class="closed-note">Daywell was closed or asleep for ${formatDuration(untracked)}, so that time isn't counted. Keep this tab open while you work.</p>` : '';
  const summary = `At desk ${formatDuration(desk)} · ${breaks} break${breaks === 1 ? '' : 's'} · not tracked ${untracked >= 1000 ? formatDuration(untracked) : 'none'}`;
  $('timeline').innerHTML = `
    <div class="tl-track" role="img" aria-label="Timeline since ${formatClock(start)}: ${summary}">${bars}<div class="tl-now" style="left:calc(${nowLeft.toFixed(3)}% - 1px)"></div></div>
    <div class="tl-axis"><span>${formatClock(start)}</span><span>${end > now ? formatClock(end) : 'now'}</span></div>
    <p class="tl-summary">${summary}</p>${closedNote}`;
}

function renderBreaks(ctx) {
  const { day } = ctx;
  const n = day.breaks.length;
  const measured = day.breaks.filter((b) => b.source === 'measured').length;
  $('breaks-chip').className = `chip ${day.mode === 'manual' ? 'chip-manual' : 'chip-measured'}`;
  $('breaks-chip').textContent = day.mode === 'manual' ? 'Manual' : 'Measured · this computer';
  const rows = [...day.breaks].reverse().map((b) => `
    <li><span class="time">${formatClock(b.start)}</span>
      <span class="grow">${b.durationMs == null ? 'Break (length not measured)' : `${formatDuration(b.durationMs)} away`}</span>
      ${chip(b.source)}</li>`).join('');
  patch($('breaks'), `
    <div class="big-number">${n} <span class="big-sub">${n ? `movement break${n === 1 ? '' : 's'} today${measured && measured !== n ? ` · ${measured} measured` : ''}` : 'breaks today'}</span></div>
    ${n ? `<ul class="list">${rows}</ul>` : '<p class="empty">No breaks yet today. Your first one will appear here, logged automatically when you step away.</p>'}`);
}

function renderWater(ctx) {
  const { day, settings, ui } = ctx;
  const total = waterTotal(day.water);
  const target = settings.waterTargetMl;
  const ratio = Math.min(1, total / target);
  $('drop-level').style.transform = `translateY(${(122 - ratio * 120).toFixed(1)}px)`;
  $('drop-pct').textContent = `${Math.round((total / target) * 100)}%`;
  patch($('water-summary'), `
    <div class="big-number">${total.toLocaleString()} <span class="big-sub">of ${target.toLocaleString()} ml</span></div>
    <div class="progress" role="progressbar" aria-label="Water today" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${total}"><span style="width:${ratio * 100}%"></span></div>
    <div class="big-sub">${total >= target ? 'Target reached. Nicely done.' : `${(target - total).toLocaleString()} ml to go`}</div>
    <p class="fineprint">The target is a general estimate, not medical advice.</p>`);
  const rows = [...day.water].reverse().map((w) => ui.editingWaterId === w.id
    ? `<li><span class="time">${formatClock(w.at)}</span>
        <span class="grow"><label class="sr-only" for="edit-${w.id}">Amount in ml</label><input id="edit-${w.id}" type="number" inputmode="numeric" min="1" max="2000" value="${w.ml}"> ml</span>
        <button class="btn-link" type="button" data-action="water-save" data-id="${w.id}">Save</button>
        <button class="btn-link" type="button" data-action="water-cancel">Cancel</button></li>`
    : `<li><span class="time">${formatClock(w.at)}</span><span class="grow">${w.ml} ml</span>
        <button class="btn-link" type="button" data-action="water-edit" data-id="${w.id}" aria-label="Edit ${w.ml} ml at ${formatClock(w.at)}">Edit</button>
        <button class="btn-link" type="button" data-action="water-delete" data-id="${w.id}" aria-label="Delete ${w.ml} ml at ${formatClock(w.at)}">Delete</button></li>`).join('');
  patch($('water-list'), day.water.length ? `<ul class="list">${rows}</ul>` : '<p class="empty">No water logged yet. One tap above adds a glass.</p>');
}

function deskStats(day, now) {
  const desk = day.segments.filter((s) => s.kind === 'desk').map((s) => (s.end ?? now) - s.start);
  if (!desk.length) return null;
  return { total: desk.reduce((a, b) => a + b, 0), longest: Math.max(...desk), stretches: desk.length };
}

function renderScreen(ctx) {
  const { day, now } = ctx;
  const manual = day.mode === 'manual';
  $('screen-chip').className = `chip ${manual ? 'chip-manual' : 'chip-measured'}`;
  $('screen-chip').textContent = manual ? 'Manual' : 'Measured · this computer';
  const s = deskStats(day, now);
  const note = `${manual ? 'Based on when you told Daywell you were at your desk.' : 'From keyboard, mouse and screen-lock signals while Daywell is open.'} Phone, other devices and per-app use aren't included.`;
  patch($('screen'), `<div class="screen-row">
      <div><div class="big-number">${s ? formatDuration(s.total) : 'No data'}</div>
        <div class="big-sub">${s ? `active on this computer today · longest stretch ${formatDuration(s.longest)}` : 'Nothing tracked yet today.'}</div></div>
      <p class="fineprint screen-note">${note}</p></div>`);
}

function tile({ href, ico, tone, label, value, sub, pct }) {
  const empty = value === 'No data';
  return `<a class="tile" href="${href}"><span class="tile-top"><span class="ico ico-${tone}">${icon(ico)}</span><span class="tile-label">${label}</span></span>
    <b class="tile-value${empty ? ' is-empty' : ''}">${value}</b>
    <span class="tile-bar">${pct == null ? '' : `<span style="width:${Math.min(100, pct).toFixed(1)}%"></span>`}</span>
    <span class="tile-sub">${sub}</span></a>`;
}

function renderGlance(ctx) {
  const { day, settings, now } = ctx;
  const s = deskStats(day, now);
  const water = day.water.length ? waterTotal(day.water) : null;
  const kcal = caloriesTotal(day.calories);
  const n = day.breaks.length;
  const tiles = [
    { href: '#move', ico: 'break', tone: 'cyan', label: 'Breaks', value: String(n), sub: n ? 'small pauses add up' : 'none yet', pct: null },
    { href: '#screen-card', ico: 'screen', tone: 'blue', label: 'Screen', value: s ? formatDuration(s.total) : 'No data', sub: day.mode === 'manual' ? 'manual' : 'measured · this computer', pct: null },
    { href: '#water', ico: 'drop', tone: 'cyan', label: 'Water', value: water == null ? 'No data' : `${water.toLocaleString()} ml`, sub: `target ${settings.waterTargetMl.toLocaleString()} ml`, pct: water == null ? null : (water / settings.waterTargetMl) * 100 },
  ];
  if (settings.caloriesEnabled) tiles.push({ href: '#water', ico: 'flame', tone: 'amber', label: 'Calories', value: kcal == null ? 'No data' : `${kcal.toLocaleString()} kcal`, sub: 'awareness only', pct: null });
  $('glance').classList.toggle('glance-5', tiles.length === 5);
  patch($('glance'), tiles.map(tile).join(''));
}

function renderWaterReminder(ctx) {
  const { day, now, settings, speed } = ctx;
  const r = day.waterReminder;
  let text;
  if (!settings.waterReminderMin) text = 'Water reminders are off. <button class="btn-link" type="button" data-action="open-settings">Turn on</button>';
  else if (r.shownCount >= settings.waterReminderCap) text = `You've had all ${settings.waterReminderCap} water reminders for today.`;
  else if (r.visible) text = 'A water reminder is showing now.';
  else if (!canNudgeNow(now, { ...settings, speed }, day)) text = 'Water reminders are on hold outside work hours.';
  else {
    const next = waterReminderNextAt(day, settings, now, speed);
    text = `Next water reminder in ${formatDuration(Math.max(0, next - now))}${day.prompt.visible ? ', after your break' : ''}.`;
  }
  patch($('water-next'), `${icon('bell')}<span>${text}</span>`);
  if (!r?.visible) {
    patch($('water-reminder'), '');
    return;
  }
  const last = lastWaterAt(day);
  patch($('water-reminder'), `<div class="nudge"><div class="nudge-head"><span class="ico ico-cyan">${icon('drop')}</span>
    <div><h3>Time for some water?</h3><p>${last ? `Your last glass was at ${formatClock(last)}.` : 'Nothing logged yet today.'}</p></div></div>
    <div class="nudge-actions"><button class="btn btn-primary" type="button" data-action="water-remind-log">${icon('drop')}+250 ml</button>
    <button class="btn-link" type="button" data-action="water-remind-dismiss">Not now</button></div></div>`);
}

function renderCalories(ctx) {
  const { day, settings } = ctx;
  $('cal-card').hidden = !settings.caloriesEnabled;
  if (!settings.caloriesEnabled) return;
  const total = caloriesTotal(day.calories);
  patch($('cal-summary'), `
    <div class="big-number">${total == null ? 'No data' : `${total.toLocaleString()} <span class="big-sub">kcal logged</span>`}</div>
    <div class="big-sub">For awareness only. No targets, no judgment.</div>`);
  const rows = [...day.calories].reverse().map((c) => `
    <li><span class="time">${formatClock(c.at)}</span><span class="grow">${c.kcal.toLocaleString()} kcal${c.note ? ` · ${esc(c.note)}` : ''}</span>
      <button class="btn-link" type="button" data-action="cal-delete" data-id="${c.id}" aria-label="Delete ${c.kcal} kcal at ${formatClock(c.at)}">Delete</button></li>`).join('');
  patch($('cal-list'), day.calories.length ? `<ul class="list">${rows}</ul>` : '<p class="empty">Nothing logged. Entries you add appear here.</p>');
}

function renderReflection(ctx) {
  const { day, settings, now } = ctx;
  const el = $('reflection');
  el.hidden = !day.wrappedUp;
  $('wrap-btn').hidden = day.wrappedUp;
  if (!day.wrappedUp) return;
  const s = summarize(day, settings, now);
  patch(el, `
    <p class="eyebrow">Your day, gently</p>
    <h2>${s.headline}</h2>
    <div class="reflection-stats">
      <div class="stat"><b>${s.breaks}</b><span>breaks${s.bySource.measured ? ` · ${s.bySource.measured} measured` : ''}</span></div>
      <div class="stat"><b>${formatDuration(s.longestMs)}</b><span>longest sitting stretch</span></div>
      <div class="stat"><b>${formatDuration(s.deskMs)}</b><span>${day.mode === 'manual' ? 'screen time (manual)' : 'screen time · measured'}</span></div>
      <div class="stat"><b>${s.waterMl == null ? 'No data' : `${s.waterMl.toLocaleString()} ml`}</b><span>water logged</span></div>
    </div>
    <p>${s.waterLine} Time when Daywell wasn't open isn't counted either way.</p>
    <button class="btn btn-soft" type="button" data-action="unwrap">Back to today</button>`);
}

const NOTIFY_STATE = { granted: 'on', default: 'available, off', denied: 'blocked', unsupported: 'not available' };

function renderYou(ctx) {
  const { day, settings, sourceLive, ui, device, storageBytes } = ctx;
  const { caps } = device;
  const advice = deviceAdvice(device);
  $('rhythm-summary').textContent = rhythmSummary(settings);
  $('device-where').textContent = `${advice.where} · ${advice.headline}`;
  const cap = (ok, text) => `<li class="${ok ? 'ok' : 'no'}">${icon(ok ? 'check' : 'x')}<span>${text}</span></li>`;
  patch($('device-caps'), [
    cap(caps.idle, `Idle signal for automatic breaks: ${caps.idle ? 'available' : 'not available'}`),
    cap(caps.notifications === 'granted', `System notifications: ${NOTIFY_STATE[caps.notifications]}`),
    cap(caps.secure, `Secure connection: ${caps.secure ? 'yes' : 'no'}`),
    cap(caps.serviceWorker, `Works offline: ${caps.serviceWorker ? 'yes' : 'no'}`),
    cap(caps.standalone, caps.standalone ? 'Installed as an app' : 'Not installed: use your browser\'s Install or Add to Home Screen option'),
  ].join(''));
  $('measure-explain').textContent = caps.idle || day.mode === 'measured' ? measureExplain(day.mode, sourceLive, ui.sourceError) : advice.detail;
  patch($('measure-actions'), !caps.idle ? ''
    : day.mode === 'measured' && sourceLive
      ? '<button class="btn btn-soft" type="button" data-action="use-manual">Switch to manual mode</button>'
      : '<button class="btn btn-soft" type="button" data-action="retry-measured">Try measured mode</button>');
  $('notify-explain').textContent = notificationAdvice(device);
  patch($('notify-actions'), caps.notifications === 'default'
    ? `<button class="btn btn-soft" type="button" data-action="enable-notifications">${icon('bell')}Turn on notifications</button>` : '');
  $('storage-size').textContent = `Using ${(storageBytes / 1024).toFixed(1)} KB in this browser.`;
}
