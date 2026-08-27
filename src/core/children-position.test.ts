import { describe, expect, it } from 'vitest';
import { positionOf } from './children';

describe('positionOf', () => {
  it('un indice dentro del array es su propia posicion', () => {
    expect(positionOf([10, 20, 30], null, 2)).toBe(2);
  });

  it('un indice fuera del array no existe', () => {
    expect(positionOf([10, 20], null, 5)).toBe(-1);
    expect(positionOf([10, 20], null, -1)).toBe(-1);
  });

  it('una clave de objeto devuelve su posicion en el orden de insercion', () => {
    expect(positionOf({ a: 1, b: 2, c: 3 }, 'c', null)).toBe(2);
  });

  it('una clave que no esta no existe', () => {
    expect(positionOf({ a: 1 }, 'z', null)).toBe(-1);
  });

  it('__proto__ se busca como clave propia', () => {
    const parsed: unknown = JSON.parse('{"a":1,"__proto__":{"x":1}}');
    expect(positionOf(parsed, '__proto__', null)).toBe(1);
  });

  it('pedir una clave en un array, o un indice en un objeto, no existe', () => {
    expect(positionOf([1, 2], 'a', null)).toBe(-1);
    expect(positionOf({ a: 1 }, null, 0)).toBe(-1);
  });

  it('los escalares no tienen hijos', () => {
    expect(positionOf(7, null, 0)).toBe(-1);
    expect(positionOf(null, 'a', null)).toBe(-1);
  });

  it('encuentra una clave muy por detras sin cortar', () => {
    const wide: Record<string, number> = {};
    for (let at = 0; at < 5000; at += 1) wide[`k${at.toString()}`] = at;
    expect(positionOf(wide, 'k4999', null)).toBe(4999);
  });
});
