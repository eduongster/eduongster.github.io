/** Project index (hover preview pane) and the detail dialogs. */
import { mountSketch, type SketchCtl } from './sketches';
import { whenVisible } from './motion';

const controllers = new WeakMap<HTMLElement, SketchCtl>();
const ctlFor = (el: HTMLElement | null) => {
  if (!el) return null;
  let c = controllers.get(el);
  if (!c) {
    c = mountSketch(el);
    controllers.set(el, c);
  }
  return c;
};

export function initProjects() {
  const index = document.querySelector<HTMLElement>('[data-index]');
  if (!index) return;
  const rows = [...index.querySelectorAll<HTMLElement>('[data-project]')];
  const panes = new Map<string, HTMLElement>();
  index.querySelectorAll<HTMLElement>('[data-pane]').forEach((p) => panes.set(p.dataset.pane!, p));
  const paneWrap = index.querySelector<HTMLElement>('.index__pane');
  let active = rows[0]?.dataset.project ?? '';
  let paneVisible = false;

  // Mount every pane sketch so each has a finished frame at rest.
  panes.forEach((p) => ctlFor(p.querySelector('[data-sketch]')));

  const sketchOf = (id: string) => ctlFor(panes.get(id)?.querySelector<HTMLElement>('[data-sketch]') ?? null);

  function setActive(id: string) {
    if (id === active) return;
    sketchOf(active)?.pause();
    active = id;
    rows.forEach((r) => (r.dataset.project === id ? (r.dataset.active = 'true') : delete r.dataset.active));
    panes.forEach((p, pid) => (pid === id ? (p.dataset.active = 'true') : delete p.dataset.active));
    if (paneVisible) sketchOf(id)?.play();
  }

  rows.forEach((row) => {
    const id = row.dataset.project!;
    row.addEventListener('pointerenter', () => setActive(id));
    row.addEventListener('focusin', () => setActive(id));
  });

  if (paneWrap) {
    whenVisible(paneWrap, (v) => {
      paneVisible = v && getComputedStyle(paneWrap).display !== 'none';
      if (paneVisible) sketchOf(active)?.play();
      else sketchOf(active)?.pause();
    });
  }

  /* ---------- Dialogs ---------- */
  const dialogs = new Map<string, HTMLDialogElement>();
  document.querySelectorAll<HTMLDialogElement>('dialog[data-dialog]').forEach((d) => dialogs.set(d.dataset.dialog!, d));

  function close(d: HTMLDialogElement) {
    if (!d.open || d.classList.contains('is-closing')) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      d.close();
      return;
    }
    d.classList.add('is-closing');
    d.addEventListener(
      'animationend',
      () => {
        d.classList.remove('is-closing');
        d.close();
      },
      { once: true },
    );
  }

  function open(id: string) {
    const d = dialogs.get(id);
    if (!d) return;
    d.showModal();
    d.querySelector<HTMLElement>('.dialog__inner')?.scrollTo(0, 0);
    d.scrollTop = 0;
    const sk = ctlFor(d.querySelector<HTMLElement>('[data-sketch]'));
    requestAnimationFrame(() => sk?.play());
  }

  dialogs.forEach((d) => {
    d.addEventListener('cancel', (e) => {
      e.preventDefault();
      close(d);
    });
    d.addEventListener('click', (e) => {
      // A click on the backdrop lands on the <dialog> itself.
      if (e.target === d) close(d);
      if ((e.target as HTMLElement).closest('[data-close]')) close(d);
    });
    d.addEventListener('close', () => ctlFor(d.querySelector<HTMLElement>('[data-sketch]'))?.pause());
    d.querySelector('[data-reseed]')?.addEventListener('click', () =>
      ctlFor(d.querySelector<HTMLElement>('[data-sketch]'))?.reseed?.(),
    );
  });

  document.addEventListener('click', (e) => {
    const trigger = (e.target as HTMLElement).closest<HTMLElement>('[data-open]');
    if (!trigger) return;
    e.preventDefault();
    open(trigger.dataset.open!);
  });
}
