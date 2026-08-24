import { describe, expect, it } from 'vitest';
import { computeStats } from './stats';

describe('computeStats', () => {
  it('cuenta nodos y profundidad', () => {
    const stats = computeStats({ a: [1, 2], b: 'x' });

    expect(stats.nodes).toBe(5);
    expect(stats.maxDepth).toBe(3);
    expect(stats.kinds.number).toBe(2);
    expect(stats.kinds.string).toBe(1);
    expect(stats.kinds.array).toBe(1);
    expect(stats.kinds.object).toBe(1);
  });

  it('trata un escalar como un unico nodo', () => {
    expect(computeStats(7).nodes).toBe(1);
    expect(computeStats(7).maxDepth).toBe(1);
  });

  it('recorre anidamiento profundo sin desbordar la pila', () => {
    const depth = 200_000;
    let deep: unknown = 'fondo';
    for (let level = 0; level < depth; level += 1) deep = { next: deep };

    const stats = computeStats(deep);
    expect(stats.maxDepth).toBe(depth + 1);
  });
});
