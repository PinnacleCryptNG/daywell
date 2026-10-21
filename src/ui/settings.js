const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const THEMES = ['system', 'light', 'dark'];
const OUT = {
  thresholdMin: (v) => `${v} min`,
  waterTargetMl: (v) => `${Number(v).toLocaleString()} ml`,
};

export function syncOutputs(form) {
  for (const o of form.querySelectorAll('output[data-out]')) o.textContent = OUT[o.dataset.out](form.elements[o.dataset.out].value);
}

export function fillSettings(form, settings) {
  form.thresholdMin.value = String(settings.thresholdMin);
  form.minBreakMin.value = String(settings.minBreakMin);
  form.dailyCap.value = String(settings.dailyCap);
  form.workStart.value = settings.workStart;
  form.workEnd.value = settings.workEnd;
  form.waterTargetMl.value = String(settings.waterTargetMl);
  form.waterReminderMin.value = String(settings.waterReminderMin);
  form.waterReminderCap.value = String(settings.waterReminderCap);
  form.caloriesEnabled.checked = settings.caloriesEnabled;
  form.theme.value = settings.theme;
  document.getElementById('work-days').innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => `
    <label><input type="checkbox" name="workDay" value="${d}" ${settings.workDays.includes(d) ? 'checked' : ''}><span>${DAYS[d]}</span></label>`).join('');
  syncOutputs(form);
}

export function readSettings(form, previous) {
  const num = (v, min, max, fallback) => {
    const n = Number(v);
    return v !== '' && Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : fallback;
  };
  return {
    ...previous,
    thresholdMin: num(form.thresholdMin.value, 1, 240, previous.thresholdMin),
    minBreakMin: num(form.minBreakMin.value, 1, 60, previous.minBreakMin),
    dailyCap: num(form.dailyCap.value, 1, 20, previous.dailyCap),
    workStart: form.workStart.value || previous.workStart,
    workEnd: form.workEnd.value || previous.workEnd,
    workDays: [...form.querySelectorAll('input[name=workDay]:checked')].map((i) => Number(i.value)),
    waterTargetMl: num(form.waterTargetMl.value, 250, 6000, previous.waterTargetMl),
    waterReminderMin: num(form.waterReminderMin.value, 0, 240, previous.waterReminderMin),
    waterReminderCap: num(form.waterReminderCap.value, 1, 12, previous.waterReminderCap),
    caloriesEnabled: form.caloriesEnabled.checked,
    theme: THEMES.includes(form.theme.value) ? form.theme.value : previous.theme,
  };
}

export function daysText(days) {
  const set = [...days].sort();
  if (set.length === 7) return 'every day';
  if (!set.length) return 'no work days set';
  if (set.join() === '1,2,3,4,5') return 'Mon–Fri';
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => set.includes(d)).map((d) => DAYS[d]).join(', ');
}

export function rhythmSummary(s) {
  const water = s.waterReminderMin
    ? `a water reminder every ${s.waterReminderMin} min, up to ${s.waterReminderCap} a day`
    : 'no water reminders';
  return `Daywell suggests a break after ${s.thresholdMin} min of real sitting, ${s.workStart}–${s.workEnd} ${daysText(s.workDays)}, with ${water}. Changes save as you go.`;
}

export function measureExplain(mode, sourceLive, error) {
  if (mode === 'measured' && sourceLive) {
    return 'Measured mode: the browser tells Daywell when there has been no keyboard or mouse input for 60 seconds, or the screen is locked. Daywell never sees what you type or which apps you use.';
  }
  if (error === 'unsupported') return 'This browser has no idle detection, so Daywell runs in manual mode. Manual mode works everywhere.';
  if (error === 'denied') return 'Idle permission was declined. If you change your mind, allow "idle detection" in the site settings, then try again.';
  return 'Manual mode: tell Daywell when you step away and come back. Breaks are labelled Manual.';
}
