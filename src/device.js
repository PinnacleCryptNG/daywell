export function parseAgent(ua = '', { touchPoints = 0, uaData = null } = {}) {
  const has = (re) => re.test(ua);
  let os = 'Unknown OS';
  if (has(/iPhone|iPad|iPod/) || (has(/Macintosh/) && touchPoints > 1)) os = 'iOS';
  else if (has(/Android/)) os = 'Android';
  else if (has(/CrOS/)) os = 'ChromeOS';
  else if (has(/Windows/)) os = 'Windows';
  else if (has(/Macintosh|Mac OS X/)) os = 'macOS';
  else if (has(/Linux/)) os = 'Linux';

  let browser = 'This browser';
  if (has(/Edg(e|A|iOS)?\//)) browser = 'Edge';
  else if (has(/OPR\//)) browser = 'Opera';
  else if (has(/SamsungBrowser\//)) browser = 'Samsung Internet';
  else if (has(/Firefox\/|FxiOS\//)) browser = 'Firefox';
  else if (has(/Chrome\/|CriOS\//)) browser = 'Chrome';
  else if (has(/Safari\//)) browser = 'Safari';

  let form = 'desktop';
  if (uaData?.mobile || has(/iPhone|iPod/) || (os === 'Android' && has(/Mobile/))) form = 'phone';
  else if (has(/iPad/) || os === 'Android' || (os === 'iOS' && has(/Macintosh/))) form = 'tablet';

  return { browser, os, form };
}

export function readCapabilities(win = globalThis.window) {
  const nav = win.navigator;
  return {
    idle: 'IdleDetector' in win && win.isSecureContext,
    notifications: 'Notification' in win ? win.Notification.permission : 'unsupported',
    serviceWorker: 'serviceWorker' in nav,
    secure: Boolean(win.isSecureContext),
    standalone: Boolean(win.matchMedia?.('(display-mode: standalone)').matches || nav.standalone),
  };
}

export function detectDevice(win = globalThis.window) {
  const nav = win.navigator;
  return { ...parseAgent(nav.userAgent, { touchPoints: nav.maxTouchPoints || 0, uaData: nav.userAgentData }), caps: readCapabilities(win) };
}

export function deviceAdvice({ browser, os, form, caps }) {
  const where = `${browser} on ${form === 'desktop' ? os : `${os} ${form}`}`;
  if (caps.idle) {
    return { mode: 'measured', where, headline: 'Measured mode available',
      detail: `${browser} can tell Daywell when you've stopped using the keyboard and mouse or locked the screen, so breaks log themselves.` };
  }
  if (form !== 'desktop') {
    return { mode: 'manual', where, headline: 'Manual mode on this device',
      detail: `Phones and tablets don't tell websites when you're at your desk, so here you tap when you step away and come back. For automatic breaks, open Daywell in Chrome or Edge on your computer.` };
  }
  return { mode: 'manual', where, headline: 'Manual mode in this browser',
    detail: `${browser} doesn't share idle signals with websites, so you tap when you step away and come back. For automatic breaks, use Chrome or Edge.` };
}

export function notificationAdvice({ os, caps }) {
  if (caps.notifications === 'unsupported') {
    return os === 'iOS' && !caps.standalone
      ? 'On iPhone and iPad, reminders can only pop up after you add Daywell to your Home Screen (Share → Add to Home Screen). Until then they show inside the app.'
      : 'This browser has no system notifications, so reminders show inside the app.';
  }
  return {
    granted: 'On. When Daywell is in the background, break and water reminders also appear as system notifications.',
    denied: 'Blocked. Reminders show only inside the app. To change it, allow notifications in the site settings.',
    default: 'Off. Reminders show only inside the app. Turn on notifications to see them while you work elsewhere.',
  }[caps.notifications];
}
