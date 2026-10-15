// Stable React keys across optimistic temp-id → server-id swaps. Without them, the moment a
// saved row receives its real id its key changes and AnimatePresence plays an exit + enter
// (the row collapses and grows back). Server ids alias to the temp id they replaced.

export type RenderKeys = ReadonlyMap<string, string>;

export const NO_RENDER_KEYS: RenderKeys = new Map();

export function keyOf(keys: RenderKeys, id: string): string {
  return keys.get(id) ?? id;
}

export function withAlias(
  keys: RenderKeys,
  serverId: string,
  tempId: string,
): RenderKeys {
  const next = new Map(keys);
  next.set(serverId, keys.get(tempId) ?? tempId);
  return next;
}
