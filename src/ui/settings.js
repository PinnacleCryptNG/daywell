const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function fillSettings(form, settings) {
  form.thresholdMin.value = String(settings.thresholdMin);
  form.minBreakMin.value = String(settings.minBreakMin);
  form.dailyCap.value = String(settings.dailyCap);
  form.workStart.value = settings.workStart;
  form.workEnd.value = settings.workEnd;
  form.waterTargetMl.value = String(settings.waterTargetMl);
  form.waterReminderMin.value = String(settings.waterReminderMin);
  form.waterReminderCap.value = String(settings.waterReminderCap);
  form.stepGoal.value = String(settings.stepGoal);
  form.caloriesEnabled.checked = settings.caloriesEnabled;
  const days = document.getElementById('work-days');
  days.innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => `
    <label><input type="checkbox" name="workDay" value="${d}" ${settings.workDays.includes(d) ? 'checked' : ''}>${DAYS[d]}</label>`).join('');
}

export function readSettings(form, previous) {
  const num = (v, min, max, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : fallback;
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
    stepGoal: num(form.stepGoal.value, 1000, 50000, previous.stepGoal),
    caloriesEnabled: form.caloriesEnabled.checked,
  };
}

export function measureExplain(mode, sourceLive, error) {
  if (mode === 'measured' && sourceLive) {
    return 'Measured mode: Chrome tells Daywell when there has been no keyboard or mouse input for 60 seconds, or the screen is locked. Daywell never sees what you type or which apps you use.';
  }
  if (error === 'unsupported') return 'This browser has no idle detection. Use desktop Chrome or Edge for measured mode. Manual mode works everywhere.';
  if (error === 'denied') return 'Idle permission was declined. If you change your mind, allow "idle detection" in the site settings, then try again.';
  return 'Manual mode: tell Daywell when you step away and come back. Breaks are labelled Manual.';
}
