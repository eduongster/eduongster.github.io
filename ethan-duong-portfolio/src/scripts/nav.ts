/** Mobile menu: open/close, focus handling, and keeping the page behind it inert. */
export function initNav() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  const label = document.querySelector<HTMLElement>('[data-menu-label]');
  if (!toggle || !menu) return;
  const behind = [document.getElementById('main'), document.querySelector('.site-footer')].filter(Boolean) as HTMLElement[];
  let open = false;
  let closeTimer = 0;

  function setOpen(next: boolean, { restoreFocus = true } = {}) {
    if (next === open) return;
    open = next;
    toggle!.setAttribute('aria-expanded', String(open));
    if (label) label.textContent = open ? 'Close menu' : 'Open menu';
    document.documentElement.style.overflow = open ? 'hidden' : '';
    behind.forEach((el) => (el.inert = open));
    clearTimeout(closeTimer);
    if (open) {
      menu!.hidden = false;
      requestAnimationFrame(() => {
        menu!.classList.add('is-open');
        menu!.querySelector<HTMLAnchorElement>('a')?.focus({ preventScroll: true });
      });
    } else {
      menu!.classList.remove('is-open');
      closeTimer = window.setTimeout(() => (menu!.hidden = true), 450);
      if (restoreFocus) toggle!.focus({ preventScroll: true });
    }
  }

  toggle.addEventListener('click', () => setOpen(!open));
  menu.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest('a');
    if (!link) return;
    if (link.getAttribute('href')?.startsWith('#')) setOpen(false, { restoreFocus: false });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) setOpen(false);
    // Keep Tab inside the menu while it's open.
    if (e.key === 'Tab' && open) {
      const items = [toggle!, ...menu!.querySelectorAll<HTMLElement>('a')];
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && (i <= 0)) {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (!e.shiftKey && i === items.length - 1) {
        e.preventDefault();
        items[0].focus();
      }
    }
  });
  window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false, { restoreFocus: false });
  });
}
