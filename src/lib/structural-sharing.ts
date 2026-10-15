// Structural sharing for server payloads (the idea behind React Query's replaceEqualDeep).
// Returns `prev` itself wherever `next` is deep-equal, so memoized rows keep their identity
// and skip re-rendering after a background refresh that changed nothing (or one cell).

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function replaceEqualDeep<T>(prev: unknown, next: T): T {
  if (Object.is(prev, next)) return next;

  if (Array.isArray(prev) && Array.isArray(next)) {
    let equal = prev.length === next.length;
    const result = next.map((item, index) => {
      const shared = replaceEqualDeep(prev[index], item);
      if (shared !== prev[index]) equal = false;
      return shared;
    });
    return (equal ? prev : result) as T;
  }

  if (isPlainObject(prev) && isPlainObject(next)) {
    const nextKeys = Object.keys(next);
    let equal = Object.keys(prev).length === nextKeys.length;
    const result: Record<string, unknown> = {};
    for (const key of nextKeys) {
      const shared = replaceEqualDeep(prev[key], next[key]);
      result[key] = shared;
      if (shared !== prev[key] || !(key in prev)) equal = false;
    }
    return (equal ? prev : result) as T;
  }

  return next;
}
