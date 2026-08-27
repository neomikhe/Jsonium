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

  it('un token sin nombre de clave delante del igual', () => {
    expect(segmentsOf('$.users[=2]')).toBeNull();
  });

  it('basura suelta entre segmentos', () => {
    expect(segmentsOf('$.a b')).not.toBeNull();
    expect(segmentsOf('$a')).toBeNull();
  });
});

describe('segmentsOf: el token de emparejado del diff', () => {
  it('se reconoce como un emparejamiento, no como clave ni indice', () => {
    const segments = segmentsOf('$.users[id=2]');
    expect(segments?.[1]).toEqual({ key: null, index: null, match: { key: 'id', identity: '2' } });
  });

  it('la identidad puede ser texto', () => {
    expect(segmentsOf('$.users[slug=ada-l]')?.[1]?.match).toEqual({ key: 'slug', identity: 'ada-l' });
  });

  it('el respaldo por indice del diff tambien se reconoce', () => {
    expect(segmentsOf('$.users[id=#3]')?.[1]?.match?.identity).toBe('#3');
  });

  it('un igual dentro de la identidad no la parte', () => {
    expect(segmentsOf('$.q[expr=a=b]')?.[1]?.match?.identity).toBe('a=b');
  });

  it('una clave entrecomillada con un igual dentro sigue siendo clave', () => {
    expect(segmentsOf('$["a=b"]')?.[0]).toEqual({ key: 'a=b', index: null, match: null });
  });
});

describe('segmentsOf: ida y vuelta con segmentOf', () => {
  const plain = (key: string | null, index: number | null): PathSegment => ({
    key,
    index,
    match: null,
  });

  const cases: PathSegment[][] = [
    [plain('store', null), plain(null, 0)],
    [plain('c d', null)],
    [plain('a]b', null)],
    [plain('di"jo', null)],
    [plain('', null)],
    [plain('123', null)],
    [plain('año', null), plain(null, 7)],
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
