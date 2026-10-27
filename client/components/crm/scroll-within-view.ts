// Scroll only the CRM's own pane. scrollIntoView also moves ancestor views,
// including the website embedding the CRM; its container option is not
// available in every supported browser.
export function scrollWithinView(
  target: HTMLElement,
  {
    block = 'start',
    behavior = 'smooth',
  }: {
    block?: 'start' | 'center' | 'nearest';
    behavior?: ScrollBehavior;
  } = {},
): void {
  const document = target.ownerDocument;
  const view = document.defaultView;
  if (!view) return;
  let container = target.parentElement;
  while (container && container !== document.scrollingElement) {
    const { overflowY } = view.getComputedStyle(container);
    if (
      /^(auto|scroll|hidden)$/.test(overflowY) &&
      container.scrollHeight > container.clientHeight
    )
      break;
    container = container.parentElement;
  }
  container ??= document.scrollingElement as HTMLElement | null;
  if (!container) return;

  const root = container === document.scrollingElement;
  const bounds = container.getBoundingClientRect();
  const top = root ? 0 : bounds.top + container.clientTop;
  const height = root ? view.innerHeight : container.clientHeight;
  const rect = target.getBoundingClientRect();
  const style = view.getComputedStyle(target);
  const start = rect.top - (parseFloat(style.scrollMarginTop) || 0) - top;
  const end =
    rect.bottom + (parseFloat(style.scrollMarginBottom) || 0) - top - height;
  let delta = start;
  if (block === 'center') delta = (start + end) / 2;
  if (block === 'nearest') {
    // Already visible, or spanning the whole pane: leave it where it is.
    if ((start >= 0 && end <= 0) || (start < 0 && end > 0)) return;
    delta = Math.abs(start) < Math.abs(end) ? start : end;
  }
  container.scrollTo({ top: container.scrollTop + delta, behavior });
}
