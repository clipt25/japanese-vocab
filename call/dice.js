// Sørensen–Dice over character bigrams. Tolerates dropped and reordered chunks
// — the actual failure mode of recognition on fast keigo — and is O(n).

function bigrams(s) {
  const out = [];
  for (let i = 0; i < s.length - 1; i += 1) out.push(s.slice(i, i + 2));
  return out;
}

export function dice(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const left = bigrams(a);
  const right = bigrams(b);
  if (left.length === 0 || right.length === 0) return 0;

  const pool = new Map();
  for (const g of left) pool.set(g, (pool.get(g) ?? 0) + 1);

  let hits = 0;
  for (const g of right) {
    const remaining = pool.get(g) ?? 0;
    if (remaining > 0) { hits += 1; pool.set(g, remaining - 1); }
  }
  return (2 * hits) / (left.length + right.length);
}
