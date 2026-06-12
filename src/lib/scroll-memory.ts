// Per-pathname scroll positions of the app scroll container, so tab switches restore
// each tab's own offset like a native app instead of resetting to the top. The document
// never scrolls (see the root layout); all scrolling happens in this container.

export const SCROLL_CONTAINER_ID = "app-scroll";

const positions = new Map<string, number>();

export function getScrollContainer(): HTMLElement | null {
  return document.getElementById(SCROLL_CONTAINER_ID);
}

export function saveScrollPosition(pathname: string): void {
  const container = getScrollContainer();
  if (container) positions.set(pathname, container.scrollTop);
}

export function getScrollPosition(pathname: string): number {
  return positions.get(pathname) ?? 0;
}
