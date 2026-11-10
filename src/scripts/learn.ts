// Learn page hero: the 3D model over the final image, same camera.
// Phones: you land on the 3D and the scroll wipes it into the photo under the title, all the
// way, with a short hold before the page moves on. Desktop: the line sweeps once on arrival,
// then it is yours to drag.
// The pictures never move; only the line does. Room buttons swap both pictures.
// Keyboard and screen readers use the range input, kept in sync with the line.
import { gsap, ScrollTrigger, reduced } from './core';
import { onDestroy } from './anim';

export function learn() {
  const box = document.querySelector<HTMLElement>('[data-cmp]');
  if (!box) return;
  const range = box.querySelector<HTMLInputElement>('[data-cmp-range]')!;
  const white = box.querySelector<HTMLImageElement>('[data-cmp-white]')!;
  const real = box.querySelector<HTMLImageElement>('[data-cmp-real]')!;
  const whiteM = box.querySelector<HTMLSourceElement>('[data-cmp-white-m]')!;
  const realM = box.querySelector<HTMLSourceElement>('[data-cmp-real-m]')!;
  const ac = new AbortController();
  const opt = { signal: ac.signal };
  const state = { x: 100 };

  const set = (pct: number) => {
    state.x = Math.min(100, Math.max(0, pct));
    box.style.setProperty('--x', `${state.x}%`);
    range.value = String(Math.round(state.x));
  };

  const hero = document.querySelector<HTMLElement>('[data-lhero]')!;
  // Phones play the same sweep as desktop (no scroll runway)
  const phone = false;

  // The sweep: model, then the photo wipes in, and the line rests in the middle
  let sweep: gsap.core.Timeline | null = null;
  const play = (delay = 0.5) => {
    sweep?.kill();
    if (reduced) return set(50);
    set(100);
    sweep = phone
      ? gsap.timeline({ onComplete: () => { sweep = null; } }).to(state, { x: 0, duration: 1.6, ease: 'expo.inOut', onUpdate: () => set(state.x) })
      : gsap.timeline({ delay })
        .to(state, { x: 8, duration: 1.9, ease: 'expo.inOut', onUpdate: () => set(state.x) })
        .to(state, { x: 50, duration: 1.1, ease: 'expo.out', onUpdate: () => set(state.x) });
  };
  const stopSweep = () => { sweep?.kill(); sweep = null; };

  let wipe: ScrollTrigger | null = null;
  if (phone) {
    // The wipe ends at 82% of the runway: the photo is whole before the page starts to move
    set(100);
    wipe = ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (st) => { if (!sweep) set(100 - Math.min(1, st.progress / 0.82) * 100); },
    });
  } else play();

  // The other views load quietly once the page has settled, so switching is instant
  const warm = () => document.querySelectorAll<HTMLButtonElement>('[data-room]').forEach((b) => {
    const mobile = window.matchMedia('(max-width: 699px)').matches;
    [mobile ? b.dataset.whiteM : b.dataset.white, mobile ? b.dataset.realM : b.dataset.real].forEach((src) => { if (src) new Image().src = src; });
  });
  const idle = setTimeout(warm, 4000);
  onDestroy(() => clearTimeout(idle));

  const fromEvent = (e: PointerEvent) => {
    const r = box.getBoundingClientRect();
    set(((e.clientX - r.left) / r.width) * 100);
  };
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let decided = false;
  box.addEventListener('pointerdown', (e) => {
    stopSweep();
    dragging = true;
    decided = e.pointerType === 'mouse';
    startX = e.clientX;
    startY = e.clientY;
    if (decided) { box.classList.add('is-drag'); fromEvent(e); }
  }, opt);
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    // On touch, a mostly vertical move is a scroll, not a drag
    if (!decided) {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx < 6 && dy < 6) return;
      if (dy > dx) { dragging = false; return; }
      decided = true;
      box.classList.add('is-drag');
    }
    fromEvent(e);
  }, opt);
  const stop = () => { dragging = false; box.classList.remove('is-drag'); };
  window.addEventListener('pointerup', stop, opt);
  window.addEventListener('pointercancel', stop, opt);
  range.addEventListener('input', () => { stopSweep(); set(Number(range.value)); }, opt);

  document.querySelectorAll<HTMLButtonElement>('[data-room]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('aria-pressed') === 'true') return;
      document.querySelectorAll('[data-room]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      white.src = btn.dataset.white!;
      whiteM.srcset = btn.dataset.whiteM!;
      real.src = btn.dataset.real!;
      realM.srcset = btn.dataset.realM!;
      real.alt = btn.dataset.alt!;
      play(0);
    }, opt);
  });

  onDestroy(() => { stopSweep(); wipe?.kill(); ac.abort(); });
  buyBox();
}

// Thank-you page: the smaller offer stays hidden until "no thanks", then slides in.
export function thanksPage() {
  paidFiles();
  const down = document.querySelector<HTMLElement>('[data-oto-down]');
  const no = document.querySelector<HTMLButtonElement>('[data-oto-no]');
  if (!down || !no) return;
  down.classList.add('is-hidden');
  const ac = new AbortController();
  no.addEventListener('click', () => {
    down.classList.remove('is-hidden');
    no.hidden = true;
    requestAnimationFrame(() => down.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }));
  }, { signal: ac.signal });
  onDestroy(() => ac.abort());
}

// Thank-you page (10/11): the PDFs show only after the server has checked the payment with Stripe
// (api/files.js, ?session_id= from the checkout). No id, not paid, Stripe or the server not answering:
// no buttons, and the line that says the PDFs are in the inbox, with WhatsApp and the email to write to.
function paidFiles() {
  const box = document.querySelector<HTMLElement>('[data-dl]');
  if (!box) return;
  const text = box.querySelector<HTMLElement>('[data-dl-text]')!;
  const btns = box.querySelector<HTMLElement>('[data-dl-btns]')!;
  const tpl = (n: string) => box.querySelector<HTMLTemplateElement>(`template[data-dl-${n}]`)!.content;
  const closed = () => {
    text.textContent = text.dataset.closed!;
    btns.append(tpl('help').cloneNode(true));
  };
  const id = new URLSearchParams(location.search).get('session_id');
  if (!id) return closed();
  fetch(`/api/files?session_id=${encodeURIComponent(id)}&lang=${box.dataset.dl}`)
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((j: { files?: { name: string; href: string; kind?: string }[]; pack?: boolean }) => {
      const files = (j.files || []).filter((f) => f.href.startsWith('/api/file?'));
      if (!files.length) return closed();
      // step 2 (10/11): the upgrade to the pack shows only now, with the payment confirmed, and not to who paid for the pack
      const up = document.querySelector<HTMLElement>('[data-upgrade]');
      if (up && j.pack === false) up.hidden = false;
      // 10/11: the Towers scene file (kind 'zip') sits next to the PDF, with its own words and the line that says what it is
      const scene = files.some((f) => f.kind === 'zip');
      const pdf = files.some((f) => f.kind !== 'zip');
      text.textContent = (scene ? (pdf ? text.dataset.okScene : text.dataset.onlyScene) : '') || text.dataset.ok!;
      for (const f of files) {
        const a = tpl('file').firstElementChild!.cloneNode(true) as HTMLAnchorElement;
        a.href = f.href;
        a.querySelector('span')!.textContent = f.kind === 'zip' ? `${f.name} · zip` : f.name;
        btns.append(a);
      }
      const note = box.querySelector<HTMLElement>('[data-dl-note]');
      if (note && scene) note.hidden = false;
    })
    .catch(closed);
}

// Learn: "Buy" on a playbook first asks "Are you sure?" (7/11): the big button takes the pack,
// the small one the playbook alone. 01 costs as much as the pack ("for the same €79"), 02 and 03
// show the difference ("with only €30 more"). Without script the link goes straight to the checkout.
export function buyBox() {
  const box = document.querySelector<HTMLDialogElement>('[data-buy-box]');
  if (!box) return;
  const ac = new AbortController();
  const opt = { signal: ac.signal };
  const q = <T extends HTMLElement>(s: string) => box.querySelector<T>(s)!;
  const fill = (tpl: string, price: string, diff: string) => tpl.replace(/\{p\}/g, price).replace(/\{d\}/g, diff);
  document.querySelectorAll<HTMLAnchorElement>('[data-buy]').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (typeof box.showModal !== 'function') return;
      e.preventDefault();
      const d = a.dataset;
      // the fan covers load lazily on the page: here they load when the box opens
      box.querySelectorAll<HTMLImageElement>('img[data-src]').forEach((img) => {
        if (img.dataset.srcset) img.srcset = img.dataset.srcset;
        img.src = img.dataset.src!;
      });
      q('[data-name]').textContent = `${d.name} · ${d.price}`;
      q('[data-text]').innerHTML = fill(Number(d.diff) > 0 ? box.dataset.more! : box.dataset.same!, d.price!, d.diffEur!);
      const pay = q<HTMLAnchorElement>('[data-pay]');
      pay.textContent = fill(box.dataset.one!, d.price!, d.diffEur!);
      pay.href = d.go!;
      q<HTMLAnchorElement>('[data-all]').href = d.bundleGo!;
      box.showModal();
      // the open box sits in the browser's top layer, above everything: the round cursor goes in with it, or it stays hidden underneath (9/11)
      const cur = document.querySelector<HTMLElement>('[data-cursor-el]');
      if (cur && cur.parentElement !== box) { home = [cur.parentElement!, cur.nextSibling]; box.append(cur); }
    }, opt);
  });
  let home: [HTMLElement, ChildNode | null] | null = null;
  box.addEventListener('close', () => {
    const cur = box.querySelector<HTMLElement>('[data-cursor-el]');
    if (cur && home) home[0].insertBefore(cur, home[1]);
    home = null;
  }, opt);
  box.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => box.close(), opt));
  box.addEventListener('click', (e) => { if (e.target === box) box.close(); }, opt);
  onDestroy(() => { ac.abort(); if (box.open) box.close(); });
}
