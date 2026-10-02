/** Skills constellation: project filters, cross-highlighting, and a slow school-like drift. */
import { prefersReducedMotion, whenVisible } from './motion';

export function initSkills() {
  const root = document.querySelector<HTMLElement>('[data-skills]');
  if (!root) return;
  const svg = root.querySelector<SVGSVGElement>('[data-constellation]');
  const filters = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const chips = [...root.querySelectorAll<HTMLElement>('[data-skill]')];
  const captions = [...root.querySelectorAll<HTMLElement>('[data-caption]')];
  const nodes = new Map<string, SVGGElement>();
  svg?.querySelectorAll<SVGGElement>('[data-node]').forEach((n) => nodes.set(n.dataset.node!, n));
  const groups = new Map<string, SVGGElement>();
  svg?.querySelectorAll<SVGGElement>('[data-links]').forEach((g) => groups.set(g.dataset.links!, g));

  function setProject(id: string | null) {
    root!.dataset.active = id ?? '';
    filters.forEach((f) => f.setAttribute('aria-pressed', String(f.dataset.filter === id)));
    groups.forEach((g, gid) => g.classList.toggle('is-on', gid === id));
    captions.forEach((c) => (c.hidden = c.dataset.caption !== id));
    chips.forEach((c) => {
      const lit = !!id && (c.dataset.projects ?? '').split(' ').includes(id);
      c.classList.toggle('is-lit', lit);
      nodes.get(c.dataset.skill!)?.classList.toggle('is-lit', lit);
    });
  }

  filters.forEach((f) =>
    f.addEventListener('click', () => {
      const id = f.dataset.filter!;
      setProject(root.dataset.active === id ? null : id);
    }),
  );

  // Hovering a chip points at its star, and vice versa.
  const hover = (slug: string, on: boolean) => {
    nodes.get(slug)?.classList.toggle('is-hover', on);
    chips.find((c) => c.dataset.skill === slug)?.classList.toggle('is-hover', on);
  };
  chips.forEach((c) => {
    c.addEventListener('pointerenter', () => hover(c.dataset.skill!, true));
    c.addEventListener('pointerleave', () => hover(c.dataset.skill!, false));
  });
  nodes.forEach((n, slug) => {
    n.addEventListener('pointerenter', () => hover(slug, true));
    n.addEventListener('pointerleave', () => hover(slug, false));
  });

  if (!svg || prefersReducedMotion()) return;

  // Drift: every node holds station like a fish in a current. Lines follow their ends.
  const base = new Map<string, { x: number; y: number; p: number; q: number }>();
  nodes.forEach((n, slug) =>
    base.set(slug, { x: Number(n.dataset.x), y: Number(n.dataset.y), p: Math.random() * 6.28, q: Math.random() * 6.28 }),
  );
  const lines = [...svg.querySelectorAll<SVGLineElement>('line[data-a]')];
  const pos = new Map<string, { x: number; y: number }>();
  let raf = 0;
  let on = false;
  const tick = (now: number) => {
    const t = now / 1000;
    base.forEach((b, slug) => {
      const x = b.x + Math.sin(t * 0.55 + b.p) * 3.2;
      const y = b.y + Math.cos(t * 0.42 + b.q) * 2.6;
      pos.set(slug, { x, y });
      nodes.get(slug)!.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    });
    for (const l of lines) {
      const a = pos.get(l.dataset.a!);
      const b = pos.get(l.dataset.b!);
      if (!a || !b) continue;
      l.setAttribute('x1', a.x.toFixed(2));
      l.setAttribute('y1', a.y.toFixed(2));
      l.setAttribute('x2', b.x.toFixed(2));
      l.setAttribute('y2', b.y.toFixed(2));
    }
    if (on) raf = requestAnimationFrame(tick);
  };
  whenVisible(svg, (v) => {
    if (v && !on) {
      on = true;
      raf = requestAnimationFrame(tick);
    } else if (!v) {
      on = false;
      cancelAnimationFrame(raf);
    }
  });
}
