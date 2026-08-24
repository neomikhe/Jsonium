import { describe, expect, it } from 'vitest';
import { childrenOf } from './children';

describe('childrenOf', () => {
  it('pagina arrays conservando el indice real', () => {
    const entries = childrenOf([10, 20, 30, 40], 1, 2);
    expect(entries.map((entry) => entry.index)).toEqual([1, 2]);
    expect(entries.map((entry) => entry.value)).toEqual([20, 30]);
  });

  it('pagina objetos por orden de clave', () => {
    const entries = childrenOf({ a: 1, b: 2, c: 3 }, 1, 2);
    expect(entries.map((entry) => entry.key)).toEqual(['b', 'c']);
  });

  it('devuelve vacio para escalares', () => {
    expect(childrenOf(42, 0, 10)).toEqual([]);
    expect(childrenOf(null, 0, 10)).toEqual([]);
  });

  it('expone __proto__ como clave propia sin contaminar Object.prototype', () => {
    const parsed: unknown = JSON.parse('{"__proto__": {"polluted": true}, "safe": 1}');
    const keys = childrenOf(parsed, 0, 10).map((entry) => entry.key);

    expect(keys).toContain('__proto__');
    expect(Object.prototype).not.toHaveProperty('polluted');
    expect(({}) as Record<string, unknown>).not.toHaveProperty('polluted');
  });
});
