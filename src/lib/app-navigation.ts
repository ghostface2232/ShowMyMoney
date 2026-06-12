// Module-scoped flag: has a client-side navigation happened this session?
// Entry animations (card stagger, bar growth) play only before the first navigation —
// i.e. on initial load or refresh — so tab switches just slide between familiar content.

let clientNavigated = false;

export function markClientNavigation(): void {
  clientNavigated = true;
}

export function hasClientNavigated(): boolean {
  return clientNavigated;
}
