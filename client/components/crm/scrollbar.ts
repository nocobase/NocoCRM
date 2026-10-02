import type { UIEvent } from 'react';

// A `scroll-quiet` scroller (client/styles.css) draws its bar only while it
// scrolls: this, its onScroll, marks it scrolling until it has been still
// for a moment.
const scrollTimers = new WeakMap<HTMLElement, number>();
export function revealScrollbar(event: UIEvent<HTMLElement>): void {
  const element = event.currentTarget;
  element.dataset.scrolling = '';
  window.clearTimeout(scrollTimers.get(element));
  scrollTimers.set(
    element,
    window.setTimeout(() => {
      delete element.dataset.scrolling;
    }, 800),
  );
}
