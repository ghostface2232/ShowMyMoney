// Per-pathname window scroll positions, so tab switches restore each tab's own
// scroll offset like a native app instead of resetting to the top.

const positions = new Map<string, number>();

export function saveScrollPosition(pathname: string): void {
  positions.set(pathname, window.scrollY);
}

export function getScrollPosition(pathname: string): number {
  return positions.get(pathname) ?? 0;
}
