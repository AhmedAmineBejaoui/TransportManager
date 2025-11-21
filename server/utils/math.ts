export function average(values: number[], fallback = 0): number {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) return fallback;
  const total = filtered.reduce((sum, value) => sum + value, 0);
  return total / filtered.length;
}
