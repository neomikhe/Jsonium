import { describe, expect, it } from 'vitest';
import { pathFrom, segmentOf, segmentsOf } from './json-path';
import type { PathSegment } from './json-path';

function keys(path: string): (string | number)[] | null {
  const segments = segmentsOf(path);
  return segments === null ? null : segments.map((s) => s.key ?? (s.index as number));
}

function roundTrip(parts: readonly PathSegment[]): string {
  return `$${parts.map((p) => segmentOf(p.key, p.index)).join('')}`;
}

describe('segmentsOf', () => {
  it('la raiz sola no tiene segmentos', () => {
    expect(segmentsOf('$')).toEqual([]);
  });

  it('claves simples con punto', () => {
    expect(keys('$.store.book')).toEqual(['store', 'book']);
  });

  it('indices de array', () => {
    expect(keys('$.book[0][12]')).toEqual(['book', 0, 12]);
  });

  it('claves entrecomilladas con espacios y acentos', () => {
    expect(keys('$["c d"]["año"]')).toEqual(['c d', 'año']);
  });

  it('una clave con corchete de cierre dentro no corta el segmento', () => {
    expect(keys('$["a]b"].x')).toEqual(['a]b', 'x']);
  });

  it('una clave con comilla escapada se recupera entera', () => {
    expect(keys('$["di\\"jo"]')).toEqual(['di"jo']);
  });

  it('mezcla de notaciones', () => {
    expect(keys('$.users[2]["full name"].id')).toEqual(['users', 2, 'full name', 'id']);
  });

  it('__proto__ es una clave normal, no un salto de prototipo', () => {
    expect(keys('$.__proto__.x')).toEqual(['__proto__', 'x']);
  });
});

describe('segmentsOf: lo que rechaza', () => {
  it('una ruta que no empieza por la raiz', () => {
    expect(segmentsOf('store.book')).toBeNull();
  });

  it('un corchete sin cerrar', () => {
    expect(segmentsOf('$.book[0')).toBeNull();
  });

  it('un punto sin nombre detras', () => {
    expect(segmentsOf('$.store.')).toBeNull();
  });

  it('un indice que no es entero', () => {
    expect(segmentsOf('$.book[1.5]')).toBeNull();
    expect(segmentsOf('$.book[abc]')).toBeNull();
    expect(segmentsOf('$.book[]')).toBeNull();
  });

  it('un indice negativo: las rutas concretas no los usan', () => {
    expect(segmentsOf('$.book[-1]')).toBeNull();
  });

  it('la notacion de emparejado por clave del diff', () => {
    expect(segmentsOf('$.users[id=2]')).toBeNull();
  });

  it('basura suelta entre segmentos', () => {
    expect(segmentsOf('$.a b')).not.toBeNull();
    expect(segmentsOf('$a')).toBeNull();
  });
});

describe('segmentsOf: ida y vuelta con segmentOf', () => {
  const cases: PathSegment[][] = [
    [{ key: 'store', index: null }, { key: null, index: 0 }],
    [{ key: 'c d', index: null }],
    [{ key: 'a]b', index: null }],
    [{ key: 'di"jo', index: null }],
    [{ key: '', index: null }],
    [{ key: '123', index: null }],
    [{ key: 'año', index: null }, { key: null, index: 7 }],
  ];

  it('toda ruta construida se vuelve a descomponer igual', () => {
    for (const parts of cases) {
      expect(segmentsOf(roundTrip(parts))).toEqual(parts);
    }
  });

  it('coincide con lo que produce pathFrom', () => {
    const link = { parent: { parent: null, key: 'users', index: null }, key: null, index: 3 };
    expect(keys(pathFrom(link))).toEqual(['users', 3]);
  });
});
