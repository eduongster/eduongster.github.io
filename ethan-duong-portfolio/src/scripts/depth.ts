/**
 * Scroll position → depth. Each section is a depth station; between stations the
 * depth is interpolated. Drives the depth gauge, the nav readout, and the active link.
 */
import { stations, zones } from '../content/site';

export const depthState = { progress: 0, depth: 0 };

type Anchor = { id: string; depth: number; at: number; el: HTMLElement };

export function initDepth() {
  const gauge = document.querySelector<HTMLElement>('[data-gauge]');
  const marker = document.querySelector<HTMLElement>('[data-gauge-marker]');
  const readout = document.querySelector<HTMLElement>('[data-gauge-depth]');
  const zoneEl = document.querySelector<HTMLElement>('[data-gauge-zone]');
  const pressureEl = document.querySelector<HTMLElement>('[data-gauge-pressure]');
  const mini = document.querySelector<HTMLElement>('[data-depth-mini]');
  const track = gauge?.querySelector<HTMLElement>('.gauge__track') ?? null;
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  const links = new Map<string, HTMLAnchorElement>();
  document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]').forEach((a) => links.set(a.dataset.navLink!, a));
  const ticks = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>('[data-gauge-station]').forEach((t) => ticks.set(t.dataset.gaugeStation!, t));

  let anchors: Anchor[] = [];
  let maxScroll = 1;
  let lastText = '';
  let lastZone = '';
  let lastActive = '';

  function measure() {
    const vh = window.innerHeight;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    const probe = vh * 0.42;
    anchors = stations
      .map((s) => {
        const el = document.getElementById(s.id);
        if (!el) return null;
        const top = el.getBoundingClientRect().top + window.scrollY;
        return { id: s.id, depth: s.depth, el, at: Math.min(maxScroll, Math.max(0, top - probe)) };
      })
      .filter((a): a is Anchor => !!a);
    anchors[0].at = 0;
    for (let i = 1; i < anchors.length; i++) anchors[i].at = Math.max(anchors[i].at, anchors[i - 1].at + 1);
    // The seafloor is the bottom of the page.
    anchors[anchors.length - 1].at = Math.min(anchors[anchors.length - 1].at, maxScroll);
    for (const a of anchors) ticks.get(a.id)?.style.setProperty('--at', `${(a.at / maxScroll) * 100}%`);
    update();
  }

  function depthAt(y: number) {
    if (y <= 0) return 0;
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i];
      const b = anchors[i + 1];
      if (y <= b.at) return a.depth + ((y - a.at) / Math.max(1, b.at - a.at)) * (b.depth - a.depth);
    }
    return anchors[anchors.length - 1].depth;
  }

  function update() {
    const y = window.scrollY;
    const progress = Math.min(1, Math.max(0, y / maxScroll));
    const depth = Math.max(0, depthAt(y));
    depthState.progress = progress;
    depthState.depth = depth;

    const text = `${Math.round(depth).toLocaleString('en-US')} m`;
    if (text !== lastText) {
      lastText = text;
      if (readout) readout.textContent = text;
      if (mini) mini.textContent = text;
      if (pressureEl) pressureEl.textContent = `${Math.round(1 + depth / 10).toLocaleString('en-US')} atm`;
    }
    const zone = zones.find((z) => depth >= z.from && depth < z.to) ?? zones[zones.length - 1];
    if (zoneEl && zone.name !== lastZone) {
      lastZone = zone.name;
      zoneEl.textContent = zone.name;
    }
    if (marker && track) marker.style.transform = `translateY(${progress * track.clientHeight}px)`;

    let current = anchors[0]?.id ?? 'top';
    for (const a of anchors) {
      if (y >= a.at - 2) current = a.id;
      ticks.get(a.id)?.classList.toggle('is-passed', y >= a.at - 2);
    }
    if (current !== lastActive) {
      lastActive = current;
      links.forEach((a, id) => {
        if (id === current) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    }
    nav?.classList.toggle('is-scrolled', y > 24);
  }

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  let t = 0;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = window.setTimeout(measure, 150);
  });
  // Layout can shift once fonts land; re-measure then.
  if ('fonts' in document) document.fonts.ready.then(measure);
  new ResizeObserver(() => measure()).observe(document.body);

  measure();
  gauge?.classList.add('is-ready');
}
