/* Reminders page: settings, notification permission, and calendar (.ics) files. */
(() => {
  const N = window.PPNotify;
  const $ = (id) => document.getElementById(id);
  if (!N) { document.querySelector('main').insertAdjacentHTML('afterbegin', '<p class="warn">Reminders could not start. Check that js/notify.js is loaded.</p>'); return; }

  const ORDER = [1, 2, 3, 4, 5, 6, 0], NAMES = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
  const state = N.load();

  /* ---------- form <-> settings ---------- */
  function days(host, key) {
    host.innerHTML = ORDER.map((d) => `<button type="button" class="chip" data-d="${d}" aria-pressed="${state[key].days.includes(d)}">${NAMES[d]}</button>`).join('');
    host.onclick = (ev) => {
      const b = ev.target.closest('[data-d]'); if (!b) return;
      const d = +b.dataset.d, set = new Set(state[key].days);
      set.has(d) ? set.delete(d) : set.add(d);
      state[key].days = [...set].sort();
      b.setAttribute('aria-pressed', String(set.has(d)));
      commit();
    };
  }
  function fill() {
    $('wOn').checked = state.workout.on; $('wTime').value = state.workout.time;
    $('dOn').checked = state.desk.on; $('dStart').value = state.desk.start; $('dEnd').value = state.desk.end; $('dEvery').value = String(state.desk.every);
    days($('wDays'), 'workout'); days($('dDays'), 'desk'); showTimes();
  }
  function showTimes() {
    const t = N.slots(state.desk).map(N.hhmm);
    $('dTimes').textContent = t.length ? `Desk break reminders at ${t.join(', ')}.` : 'Set a start time that is before the end time.';
  }
  function say(id, text) { $(id).textContent = text; }
  function commit() {
    const cur = N.load(); cur.workout = state.workout; cur.desk = state.desk; N.save(cur);
    showTimes(); say('wMsg', ''); say('dMsg', '');
  }

  $('wOn').onchange = () => { state.workout.on = $('wOn').checked; commit(); say('wMsg', state.workout.on ? 'Workout reminder is on.' : 'Workout reminder is off.'); };
  $('wTime').onchange = () => { if ($('wTime').value) { state.workout.time = $('wTime').value; commit(); } };
  $('dOn').onchange = () => { state.desk.on = $('dOn').checked; commit(); say('dMsg', state.desk.on ? 'Desk break reminders are on.' : 'Desk break reminders are off.'); };
  $('dStart').onchange = () => { if ($('dStart').value) { state.desk.start = $('dStart').value; commit(); } };
  $('dEnd').onchange = () => { if ($('dEnd').value) { state.desk.end = $('dEnd').value; commit(); } };
  $('dEvery').onchange = () => { state.desk.every = +$('dEvery').value; commit(); };

  /* ---------- notification permission ---------- */
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  function permText() {
    if (typeof Notification === 'undefined') return 'This browser does not support notifications. Use the calendar option below.';
    if (ios && !standalone) return 'iPhone and iPad only allow web notifications for apps added to the Home Screen. Use the calendar option below instead.';
    if (Notification.permission === 'granted') return 'Notifications are allowed.';
    if (Notification.permission === 'denied') return 'Notifications are blocked. Re-enable them in your browser settings for this site, or use the calendar option below.';
    return 'Notifications are not allowed yet.';
  }
  const refreshPerm = () => say('permState', permText());
  refreshPerm();

  $('permBtn').onclick = async () => {
    if (typeof Notification === 'undefined') { refreshPerm(); return; }
    try {
      await Notification.requestPermission();
      if (Notification.permission === 'granted' && 'serviceWorker' in navigator && window.isSecureContext) {
        navigator.serviceWorker.register('reminder-sw.js').catch(() => {});      // needed for notifications on phones
      }
    } catch {}
    refreshPerm();
  };
  $('testBtn').onclick = async () => {
    const granted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
    if (granted && await N.osNotify('desk')) { say('permState', 'Test sent. If you did not see it, check your device notification settings.'); return; }
    N.toast('desk'); say('permState', 'Showing the on-page version. ' + permText());
  };

  /* ---------- calendar files ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const fold = (line) => { let out = ''; while (line.length > 75) { out += line.slice(0, 75) + '\r\n '; line = line.slice(75); } return out + line; };
  const utc = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  const local = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  function nextStart(minutes, dayList, now) {
    for (let i = 0; i < 8; i++) {
      const d = new Date(now); d.setDate(d.getDate() + i); d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      if (dayList.includes(d.getDay()) && d > now) return d;
    }
    return null;
  }

  /* events: [{ title, text, url, minutes (time of day), days, length (minutes) }] */
  function buildICS(events, now = new Date()) {
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PosturePilot//Reminders//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    events.forEach((e, i) => {
      const start = nextStart(e.minutes, e.days, now); if (!start) return;
      const end = new Date(start.getTime() + e.length * 60000);
      const rule = e.days.length === 7 ? 'FREQ=DAILY' : 'FREQ=WEEKLY;BYDAY=' + e.days.map((d) => BYDAY[d]).join(',');
      L.push('BEGIN:VEVENT', `UID:posturepilot-${i}-${e.minutes}-${utc(now)}@posturepilot`, `DTSTAMP:${utc(now)}`,
        `DTSTART:${local(start)}`, `DTEND:${local(end)}`, `RRULE:${rule}`, `SUMMARY:${esc(e.title)}`,
        `DESCRIPTION:${esc(e.text + '\n' + e.url)}`, `URL:${e.url}`,
        'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, 'END:VALARM', 'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }

  function download(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const abs = (p) => new URL(p, location.href).href;

  $('wIcs').onclick = () => {
    if (!state.workout.days.length) { say('wMsg', 'Pick at least one day first.'); return; }
    download('posturepilot-workout-reminder.ics', buildICS([{ title: 'PosturePilot workout', text: 'Time for your posture workout.', url: abs('plan.html?start=1'), minutes: N.mins(state.workout.time), days: state.workout.days, length: 20 }]));
    say('wMsg', 'Calendar file downloaded. Open it to add the repeating reminder.');
  };
  $('dIcs').onclick = () => {
    const times = N.slots(state.desk);
    if (!times.length || !state.desk.days.length) { say('dMsg', 'Set a start before the end time and pick at least one day.'); return; }
    download('posturepilot-desk-break-reminders.ics', buildICS(times.map((m) => ({ title: 'PosturePilot desk break', text: 'Two minutes to loosen up your neck, shoulders and back.', url: abs('desk.html?start=1'), minutes: m, days: state.desk.days, length: 5 }))));
    say('dMsg', `Calendar file downloaded with ${times.length} reminder${times.length > 1 ? 's' : ''} a day.`);
  };

  window.PPReminders = { buildICS, nextStart };
  fill();
})();