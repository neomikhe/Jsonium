import { describe, expect, it } from 'vitest';
import type { DiffChange, DiffOptions } from './diff';
import { diff } from './diff';

const BY_INDEX: DiffOptions = { arrayKey: null, limit: 100 };
const BY_ID: DiffOptions = { arrayKey: 'id', limit: 100 };

function changesOf(left: unknown, right: unknown, options = BY_INDEX): DiffChange[] {
  return diff(left, right, options).changes;
}

function shapesOf(left: unknown, right: unknown, options = BY_INDEX): string[] {
  return changesOf(left, right, options).map((change) => `${change.kind} ${change.path}`);
}

describe('diff: documentos iguales', () => {
  it('no reporta cambios en estructuras identicas', () => {
    const value = { a: 1, b: [1, 2, { c: 'x' }], d: null, e: false };
    expect(changesOf(value, structuredClone(value))).toEqual([]);
  });

  it('ignora el orden de las claves de un objeto', () => {
    expect(changesOf({ a: 1, b: 2 }, { b: 2, a: 1 })).toEqual([]);
  });
});

describe('diff: objetos', () => {
  it('detecta claves anadidas y eliminadas', () => {
    expect(shapesOf({ a: 1, b: 2 }, { a: 1, c: 3 })).toEqual(['removed $.b', 'added $.c']);
  });

  it('detecta valores cambiados', () => {
    const changes = changesOf({ a: 1 }, { a: 2 });
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({ kind: 'changed', path: '$.a', before: '1', after: '2' });
  });

  it('detecta cambios de tipo', () => {
    const changes = changesOf({ a: 1 }, { a: '1' });
    expect(changes[0]?.kind).toBe('changed');
    expect(changes[0]?.before).toBe('1');
    expect(changes[0]?.after).toBe('"1"');
  });

  it('desciende por objetos anidados', () => {
    expect(shapesOf({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toEqual(['changed $.a.b.c']);
  });

  it('escapa claves raras en la ruta', () => {
    expect(shapesOf({ 'con espacio': 1 }, { 'con espacio': 2 })).toEqual([
      'changed $["con espacio"]',
    ]);
  });

  it('distingue null de ausente', () => {
    expect(shapesOf({ a: null }, {})).toEqual(['removed $.a']);
    expect(shapesOf({ a: null }, { a: 1 })).toEqual(['changed $.a']);
  });
});

describe('diff: arrays por indice', () => {
  it('compara posicion a posicion', () => {
    expect(shapesOf([1, 2, 3], [1, 9, 3])).toEqual(['changed $[1]']);
  });

  it('reporta sobrantes y faltantes al final', () => {
    expect(shapesOf([1, 2], [1, 2, 3])).toEqual(['added $[2]']);
    expect(shapesOf([1, 2, 3], [1, 2])).toEqual(['removed $[2]']);
  });

  it('una insercion al principio desplaza todo', () => {
    expect(shapesOf([1, 2], [0, 1, 2])).toEqual(['changed $[0]', 'changed $[1]', 'added $[2]']);
  });

  it('desciende por objetos dentro de arrays', () => {
    expect(shapesOf([{ a: 1 }], [{ a: 2 }])).toEqual(['changed $[0].a']);
  });
});

describe('diff: arrays por clave', () => {
  const left = [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Linus' },
  ];

  it('ignora el reordenamiento', () => {
    const right = [
      { id: 2, name: 'Linus' },
      { id: 1, name: 'Ada' },
    ];
    expect(changesOf(left, right, BY_ID)).toEqual([]);
  });

  it('reporta el cambio en el elemento correcto pese al reorden', () => {
    const right = [
      { id: 2, name: 'Torvalds' },
      { id: 1, name: 'Ada' },
    ];
    expect(shapesOf(left, right, BY_ID)).toEqual(['changed $[id=2].name']);
  });

  it('detecta altas y bajas por clave', () => {
    const right = [
      { id: 1, name: 'Ada' },
      { id: 3, name: 'Grace' },
    ];
    expect(shapesOf(left, right, BY_ID)).toEqual(['removed $[id=2]', 'added $[id=3]']);
  });

  it('cae a la posicion cuando falta la clave', () => {
    expect(shapesOf([{ x: 1 }], [{ x: 2 }], BY_ID)).toEqual(['changed $[id=#0].x']);
  });

  it('cae a la posicion cuando la clave no es un escalar', () => {
    const withObjectIds = [
      { id: { a: 1 }, v: 1 },
      { id: { a: 2 }, v: 2 },
    ];
    const changed = [
      { id: { a: 1 }, v: 1 },
      { id: { a: 2 }, v: 9 },
    ];
    expect(shapesOf(withObjectIds, changed, BY_ID)).toEqual(['changed $[id=#1].v']);
  });

  it('acepta claves numericas y booleanas', () => {
    expect(shapesOf([{ id: 7, v: 1 }], [{ id: 7, v: 2 }], BY_ID)).toEqual(['changed $[id=7].v']);
  });

  it('el mismo reorden por indice si genera ruido', () => {
    const right = [
      { id: 2, name: 'Linus' },
      { id: 1, name: 'Ada' },
    ];
    expect(changesOf(left, right, BY_INDEX).length).toBeGreaterThan(0);
  });
});

describe('diff: resumen y limite', () => {
  it('cuenta los cambios por tipo', () => {
    const result = diff({ a: 1, b: 2 }, { a: 9, c: 3 }, BY_INDEX);
    expect(result.summary).toEqual({ added: 1, removed: 1, changed: 1 });
  });

  it('corta en el limite y lo senala', () => {
    const left = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`k${i}`, i]));
    const right = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`k${i}`, i + 1]));
    const result = diff(left, right, { arrayKey: null, limit: 10 });

    expect(result.changes).toHaveLength(10);
    expect(result.isTruncated).toBe(true);
  });
});

describe('diff: robustez', () => {
  it('compara raices de tipos distintos', () => {
    expect(shapesOf({ a: 1 }, [1])).toEqual(['changed $']);
    expect(shapesOf(1, 'uno')).toEqual(['changed $']);
  });

  it('trata __proto__ como una clave normal', () => {
    const left: unknown = JSON.parse('{"__proto__": 1}');
    const right: unknown = JSON.parse('{"__proto__": 2}');

    expect(shapesOf(left, right)).toEqual(['changed $.__proto__']);
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('recorre anidamiento profundo sin desbordar la pila', () => {
    const depth = 50_000;
    let left: unknown = 'a';
    let right: unknown = 'b';
    for (let level = 0; level < depth; level += 1) {
      left = { next: left };
      right = { next: right };
    }

    const result = diff(left, right, BY_INDEX);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]?.kind).toBe('changed');
  });
});
