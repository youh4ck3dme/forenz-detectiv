/** Accept plain array or `(prev) => next`; never store a Function or non-array. */
export function resolveEntityArrayUpdate(current, valueOrUpdater) {
  const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(current) : valueOrUpdater;
  if (Array.isArray(next)) return next;
  return Array.isArray(current) ? current : [];
}

export function makeEntityArraySetter(set, key) {
  return (valueOrUpdater) =>
    set((state) => ({
      [key]: resolveEntityArrayUpdate(state[key], valueOrUpdater)
    }));
}
