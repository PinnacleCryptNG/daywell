export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;

const pad = (n) => String(n).padStart(2, '0');

export function dateKey(t) {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseHHMM(value) {
  const [h, m] = String(value).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function inWorkHours(t, settings) {
  const d = new Date(t);
  if (!settings.workDays.includes(d.getDay())) return false;
  const minutes = d.getHours() * 60 + d.getMinutes();
  return minutes >= parseHHMM(settings.workStart) && minutes < parseHHMM(settings.workEnd);
}

export function formatClock(t) {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDuration(ms) {
  if (ms == null) return 'No data';
  const totalMin = Math.floor(ms / MINUTE);
  if (ms < MINUTE) return `${Math.floor(ms / SECOND)} s`;
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h} h ${pad(m)} min` : `${h} h`;
}

export function formatTimer(ms) {
  const total = Math.max(0, Math.floor(ms / SECOND));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
