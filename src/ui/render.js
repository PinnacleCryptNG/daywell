import { canNudgeNow, effective, isBreakSegment, openSegment, sittingMs, status } from '../engine.js';
import { formatClock, formatDuration, formatTimer, inWorkHours, MINUTE } from '../time.js';
import { lastWaterAt, waterReminderNextAt, waterTotal } from '../water.js';
import { caloriesTotal, latestSteps } from '../habits.js';
import { summarize } from '../reflection.js';

const $ = (id) => document.getElementById(id);
const RING = 2 * Math.PI * 52;

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

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const chip = (source) => `<span class="chip chip-${source}">${SOURCE_LABEL[source]}</span>`;

export function render(ctx) {
  const { day } = ctx;
  $('welcome').hidden = day.started;
  $('today').hidden = !day.started;
  renderChrome(ctx);
  if (!day.started) return;
  renderHero(ctx);
  renderTimeline(ctx);
  renderScreen(ctx);
  renderSteps(ctx);
  renderBreaks(ctx);
  renderWaterReminder(ctx);
  renderWater(ctx);
  renderCalories(ctx);
  renderReflection(ctx);
}

function sourceChip(ctx) {
  const { day, sourceLive } = ctx;
  if (!day.started) return null;
  if (day.mode === 'manual') return { cls: 'chip-manual', text: 'Manual mode' };
  if (sourceLive) return { cls: 'chip-measured', text: 'Measured · this computer' };
  return { cls: '', text: 'Not measuring' };
}

function renderChrome(ctx) {
  const c = sourceChip(ctx);
  const el = $('source-chip');
  el.hidden = !c;
  if (c) {
    el.className = `chip chip-dark ${c.cls}`;
    el.textContent = c.text;
  }
  const demo = $('demo-banner');
  demo.hidden = ctx.speed === 1;
  if (ctx.speed !== 1) {
    patch(demo, `Demo speed ×${ctx.speed}: break thresholds run ${ctx.speed}× faster for recording. Work hours are ignored. Idle detection and durations are real. <a href="./">Exit demo speed</a>`);
  }
  const promptUp = ctx.day.prompt.visible;
  const waterUp = ctx.day.waterReminder?.visible;
  document.title = promptUp ? '• Time for a short break · Daywell' : waterUp ? '• Time for some water · Daywell' : 'Daywell';
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
  wrap.classList.toggle('is-away', st === 'away');
  wrap.classList.toggle('is-over', st === 'sitting' && sit >= thresholdMs);

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
    lineAction = '<button class="btn btn-soft btn-sm" type="button" data-action="ignore-hours">Remind me anyway today</button> <button class="btn-link" type="button" data-action="open-settings">Change hours</button>';
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
  patch($('hero-meta'), `${sourceText}<span class="fineprint">Threshold ${settings.thresholdMin} min${speed !== 1 ? ` (×${speed} demo)` : ''}</span>`);

  let actions = '';
  if (day.mode === 'manual') {
    actions = st === 'sitting'
      ? '<button class="btn btn-soft" type="button" data-action="manual-away">I\'m stepping away</button>'
      : '<button class="btn btn-primary" type="button" data-action="manual-active">I\'m at my desk</button>';
  } else if (!sourceLive) {
    actions = '<button class="btn btn-primary" type="button" data-action="resume-measuring">Resume measuring</button>';
  }
  if (ui.sourceError === 'denied' || ui.sourceError === 'unsupported') {
    actions += `<p class="fineprint">${ui.sourceError === 'denied'
      ? 'Idle permission was declined, so Daywell is in manual mode. You can try measured mode again in Settings.'
      : 'This browser has no idle detection (try Chrome or Edge on desktop), so Daywell is in manual mode.'}</p>`;
  }
  patch($('hero-actions'), actions);

  const promptEl = $('prompt');
  promptEl.hidden = !p.visible;
  if (p.visible) {
    const tip = SUGGESTIONS[(p.shownCount - 1 + SUGGESTIONS.length) % SUGGESTIONS.length];
    patch(promptEl, `
      <h3>You've been sitting for ${formatDuration(sit)}.</h3>
      <p>${tip}</p>
      <div class="prompt-actions">
        <button class="btn btn-primary" type="button" data-action="done">Done</button>
        <button class="btn btn-soft" type="button" data-action="snooze" data-min="10">Snooze 10 min</button>
        <button class="btn btn-soft" type="button" data-action="snooze" data-min="30">Snooze 30 min</button>
        <button class="btn btn-ghost" type="button" data-action="pause">Pause for today</button>
      </div>`);
  }

  const n = day.notice;
  let notice = '';
  if (n?.kind === 'break') {
    notice = `<div class="notice-inner"><span><strong>Welcome back.</strong> Break logged: ${formatDuration(n.durationMs)} away.</span><span class="spacer"></span>
      <button class="btn-link" type="button" data-action="undo-break" data-id="${n.breakId}">Undo, I was here</button>
      <button class="btn-link" type="button" data-action="dismiss-notice">Dismiss</button></div>`;
  } else if (n?.kind === 'reported') {
    notice = `<div class="notice-inner"><span><strong>Enjoy the break.</strong> ${day.mode === 'measured' ? 'If you step away, Daywell will measure how long.' : 'Logged as reported.'}</span><span class="spacer"></span>
      <button class="btn-link" type="button" data-action="dismiss-notice">Dismiss</button></div>`;
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
  const summary = `At desk ${formatDuration(desk)} · ${breaks} break${breaks === 1 ? '' : 's'} · not tracked ${untracked >= 1000 ? formatDuration(untracked) : 'none'}`;
  $('timeline').innerHTML = `
    <div class="tl-track" role="img" aria-label="Timeline since ${formatClock(start)}: ${summary}">${bars}<div class="tl-now" style="left:calc(${nowLeft.toFixed(3)}% - 1px)"></div></div>
    <div class="tl-axis"><span>${formatClock(start)}</span><span>${end > now ? formatClock(end) : 'now'}</span></div>
    <p class="tl-summary">${summary}</p>`;
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
    <div class="big-number">${n}</div>
    <div class="big-sub">${n ? `movement break${n === 1 ? '' : 's'} today${measured && measured !== n ? ` · ${measured} measured` : ''}` : 'breaks today'}</div>
    ${n ? `<ul class="list">${rows}</ul>` : '<p class="empty">No breaks yet today. Your first one will appear here, logged automatically when you step away.</p>'}`);
}

function renderWater(ctx) {
  const { day, settings, ui } = ctx;
  const total = waterTotal(day.water);
  const target = settings.waterTargetMl;
  const pct = Math.min(100, (total / target) * 100);
  patch($('water-summary'), `
    <div class="big-number">${total.toLocaleString()} <span class="big-sub">of ${target.toLocaleString()} ml</span></div>
    <div class="progress" role="progressbar" aria-label="Water today" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${total}"><span style="width:${pct}%"></span></div>
    <div class="big-sub">${total >= target ? 'Target reached. Nicely done.' : `${(target - total).toLocaleString()} ml to go · target is a general estimate, not medical advice`}</div>`);
  const rows = [...day.water].reverse().map((w) => ui.editingWaterId === w.id
    ? `<li><span class="time">${formatClock(w.at)}</span>
        <span class="grow"><label class="sr-only" for="edit-${w.id}">Amount in ml</label><input id="edit-${w.id}" type="number" min="1" max="2000" value="${w.ml}"> ml</span>
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
  patch($('screen'), s
    ? `<div class="big-number">${formatDuration(s.total)}</div>
      <div class="big-sub">active on this computer today · longest stretch ${formatDuration(s.longest)}</div>
      <p class="empty">${manual ? 'Based on when you told Daywell you were at your desk.' : 'Counted from keyboard, mouse and screen-lock signals while Daywell is open.'} Your phone, other devices and which apps you used aren't included.</p>`
    : '<div class="big-number">No data</div><div class="big-sub">Nothing tracked yet today.</div>');
}

function renderSteps(ctx) {
  const { day, settings } = ctx;
  const goal = settings.stepGoal;
  const last = latestSteps(day.steps);
  if (!last) {
    patch($('steps-summary'), `<div class="big-number">No data</div><div class="big-sub">Goal ${goal.toLocaleString()} steps. Type today's count from your phone below.</div>`);
    return;
  }
  const pct = Math.min(100, (last.total / goal) * 100);
  patch($('steps-summary'), `
    <div class="big-number">${last.total.toLocaleString()} <span class="big-sub">of ${goal.toLocaleString()} steps</span></div>
    <div class="progress" role="progressbar" aria-label="Steps today" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${last.total}"><span style="width:${pct}%"></span></div>
    <div class="big-sub">${last.total >= goal ? 'Goal reached. Nicely done.' : `${(goal - last.total).toLocaleString()} to go`} · updated ${formatClock(last.at)}
      <button class="btn-link" type="button" data-action="steps-undo" data-id="${last.id}">Undo update</button></div>`);
}

function renderWaterReminder(ctx) {
  const { day, now } = ctx;
  const r = day.waterReminder;
  if (!r?.visible) {
    const { settings, speed } = ctx;
    let text;
    if (!settings.waterReminderMin) text = 'Water reminders are off. <button class="btn-link" type="button" data-action="open-settings">Turn on</button>';
    else if (r.shownCount >= settings.waterReminderCap) text = `You've had all ${settings.waterReminderCap} water reminders for today.`;
    else if (!canNudgeNow(now, { ...settings, speed }, day)) text = 'Water reminders are on hold outside work hours.';
    else {
      const next = waterReminderNextAt(day, settings, now, speed);
      text = `Next water reminder in ${formatDuration(Math.max(0, next - now))}${day.prompt.visible ? ', after your break' : ''}.`;
    }
    patch($('water-reminder'), `<p class="fineprint">${text}</p>`);
    return;
  }
  const last = lastWaterAt(day);
  patch($('water-reminder'), `<div class="notice-inner"><span><strong>Time for some water?</strong> ${last ? `Your last glass was at ${formatClock(last)}.` : 'Nothing logged yet today.'}</span><span class="spacer"></span>
    <button class="btn btn-primary" type="button" data-action="water-remind-log">+250 ml</button>
    <button class="btn-link" type="button" data-action="water-remind-dismiss">Not now</button></div>`);
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
      <div class="stat"><b>${s.steps == null ? 'No data' : s.steps.toLocaleString()}</b><span>steps · from your phone</span></div>
      <div class="stat"><b>${s.waterMl == null ? 'No data' : `${s.waterMl.toLocaleString()} ml`}</b><span>water logged</span></div>
    </div>
    <p>${s.waterLine} Time when Daywell wasn't open isn't counted either way.</p>
    <button class="btn btn-soft" type="button" data-action="unwrap">Back to today</button>`);
}
