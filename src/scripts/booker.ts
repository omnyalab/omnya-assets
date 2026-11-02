// The booking widget (components/Booker.astro): free days → free times → name and email → booked.
// A Build is two calls, so it asks for two times before the form.

import { lenis, reduced } from './core';

type Strings = Record<'nth' | 'second' | 'change' | 'none' | 'error' | 'retry' | 'sending' | 'confirm' | 'taken' | 'failed' | 'bad', string>;

const goTo = (el: HTMLElement, offset = -100) => {
  if (lenis && !reduced) lenis.scrollTo(el, { duration: 1, offset });
  else el.scrollIntoView({ block: 'start' });
};

export function booker() {
  document.querySelectorAll<HTMLElement>('[data-booker]').forEach(init);
}

function init(root: HTMLElement) {
  if (root.dataset.ready) return;
  root.dataset.ready = '1';
  const type = root.dataset.type!;
  const lang = root.dataset.lang === 'it' ? 'it' : 'en';
  const T: Strings = JSON.parse(root.dataset.t!);
  const locale = lang === 'it' ? 'it-IT' : 'en-GB';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Rome';
  const $ = <E extends HTMLElement>(s: string) => root.querySelector<E>(s)!;
  const status = $('[data-status]');
  const cal = $('[data-cal]');
  const daysEl = $('[data-days]');
  const timesEl = $('[data-times]');
  const picksEl = $('[data-picks]');
  const form = $<HTMLFormElement>('[data-form]');
  const err = $('[data-err]');
  const submit = $<HTMLButtonElement>('[data-submit]');
  const submitLabel = $('[data-submit-label]');
  const done = $('[data-done]');

  const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const fWeek = new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: 'short' });
  const fDay = new Intl.DateTimeFormat(locale, { timeZone: tz, day: 'numeric' });
  const fMonth = new Intl.DateTimeFormat(locale, { timeZone: tz, month: 'short' });
  const fTime = new Intl.DateTimeFormat(locale, { timeZone: tz, hour: '2-digit', minute: '2-digit' });
  const fLong = new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const tzName = tz.replace(/_/g, ' ');
  $('[data-bkg-tz]').textContent += ` · ${tzName}`;

  let minutes = 30;
  let calls = 1;
  let slots: number[] = [];
  let picks: number[] = [];
  let day = '';

  const nth = (i: number) => T.nth.replace('{n}', String(i + 1)).replace('{m}', String(calls));
  const len = () => minutes * 60_000;
  // times still possible for the call being picked: not overlapping one already chosen
  const open = () => slots.filter((s) => picks.every((p) => s + len() <= p || s >= p + len()));

  async function load() {
    status.hidden = false;
    cal.hidden = true;
    try {
      const r = await fetch(`/api/slots?type=${type}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      minutes = j.minutes;
      calls = j.calls;
      slots = j.slots;
    } catch {
      status.innerHTML = '';
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'u';
      b.textContent = T.retry;
      b.onclick = () => load();
      status.append(`${T.error} `, b);
      return;
    }
    picks = picks.filter((p) => slots.includes(p));
    render();
  }

  function render() {
    const free = open();
    renderPicks();
    if (picks.length >= calls) {
      cal.hidden = true;
      status.hidden = true;
      showForm();
      return;
    }
    form.hidden = true;
    if (!free.length) {
      status.hidden = false;
      status.textContent = T.none;
      cal.hidden = true;
      return;
    }
    status.hidden = true;
    cal.hidden = false;
    const byDay = new Map<string, number[]>();
    for (const s of free) {
      const k = dayKey.format(s);
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k)!.push(s);
    }
    if (!byDay.has(day)) day = byDay.keys().next().value!;
    daysEl.replaceChildren(
      ...[...byDay.entries()].map(([k, list]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bkg__day';
        b.setAttribute('aria-pressed', String(k === day));
        b.innerHTML = `<span>${fWeek.format(list[0])}</span><b>${fDay.format(list[0])}</b><span>${fMonth.format(list[0])}</span>`;
        b.onclick = () => {
          day = k;
          render();
        };
        return b;
      })
    );
    daysEl.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    timesEl.replaceChildren(
      ...byDay.get(day)!.map((s) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bkg__time';
        b.textContent = fTime.format(s);
        b.onclick = () => {
          picks.push(s);
          render();
          if (picks.length < calls) goTo(root);
        };
        return b;
      })
    );
  }

  function renderPicks() {
    picksEl.hidden = calls < 2 && !picks.length;
    const rows = Array.from({ length: calls }, (_, i) => {
      const row = document.createElement('div');
      row.className = 'bkg__pick';
      const p = picks[i];
      if (p == null) row.classList.add(i === picks.length ? 'is-now' : 'is-next');
      row.innerHTML = `<span class="bkg__pickn">${calls > 1 ? nth(i) : ''}</span><span class="bkg__pickt"></span>`;
      row.querySelector('.bkg__pickt')!.textContent = p != null ? `${fLong.format(p)} · ${minutes} min` : i === picks.length && i > 0 ? T.second : '—';
      if (p != null) {
        const c = document.createElement('button');
        c.type = 'button';
        c.className = 'u bkg__change';
        c.textContent = T.change;
        c.onclick = () => {
          picks = picks.slice(0, i);
          day = dayKey.format(p);
          render();
        };
        row.append(c);
      }
      return row;
    });
    picksEl.replaceChildren(...rows);
  }

  function showForm() {
    form.hidden = false;
    err.textContent = '';
    form.querySelector<HTMLInputElement>('[name="name"]')?.focus({ preventScroll: true });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      err.textContent = T.bad;
      return;
    }
    submit.disabled = true;
    submitLabel.textContent = T.sending;
    err.textContent = '';
    try {
      const r = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, starts: picks, name, email, note: fd.get('note'), website: fd.get('website'), lang, tz }),
      });
      if (r.status === 409) {
        picks = [];
        err.textContent = '';
        await load();
        status.hidden = false;
        status.textContent = T.taken;
        return;
      }
      if (!r.ok) throw new Error(String(r.status));
      form.hidden = true;
      picksEl.hidden = true;
      $('[data-when]').replaceChildren(
        ...picks.map((p, i) => {
          const li = document.createElement('li');
          li.textContent = `${calls > 1 ? `${nth(i)}: ` : ''}${fLong.format(p)} · ${minutes} min`;
          return li;
        })
      );
      done.hidden = false;
      goTo(done, -160);
    } catch {
      err.textContent = T.failed;
    } finally {
      submit.disabled = false;
      submitLabel.textContent = T.confirm;
    }
  });

  load();
}
