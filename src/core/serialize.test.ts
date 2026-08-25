import { describe, expect, it } from 'vitest';
import { serialize } from './serialize';

const SAMPLE = {
  zebra: 1,
  alpha: [1, 'dos', true, null, { nested: [] }],
  mid: { b: {}, a: [[1], [2, 3]] },
  text: 'con "comillas" y \n salto',
  unicode: 'acentos: áéí · emoji: \u2728',
};

describe('serialize', () => {
  it('coincide byte a byte con JSON.stringify indentado', () => {
    expect(serialize(SAMPLE, { indent: 2, sortKeys: false })).toBe(JSON.stringify(SAMPLE, null, 2));
  });

  it('coincide byte a byte con JSON.stringify minificado', () => {
    expect(serialize(SAMPLE, { indent: 0, sortKeys: false })).toBe(JSON.stringify(SAMPLE));
  });

  it('respeta indentaciones distintas de 2', () => {
    expect(serialize(SAMPLE, { indent: 4, sortKeys: false })).toBe(JSON.stringify(SAMPLE, null, 4));
  });

  it('mantiene contenedores vacios en una linea', () => {
    expect(serialize({ a: {}, b: [] }, { indent: 2, sortKeys: false })).toBe(
      JSON.stringify({ a: {}, b: [] }, null, 2),
    );
  });

  it('ordena las claves en todos los niveles', () => {
    const value = { b: 1, a: { d: 2, c: 3 } };
    expect(serialize(value, { indent: 0, sortKeys: true })).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it('ordenar claves no altera el orden de los arrays', () => {
    expect(serialize({ list: [3, 1, 2] }, { indent: 0, sortKeys: true })).toBe('{"list":[3,1,2]}');
  });

  it('escapa las claves peligrosas en lugar de interpretarlas', () => {
    const parsed: unknown = JSON.parse('{"__proto__": 1, "a": 2}');
    expect(serialize(parsed, { indent: 0, sortKeys: false })).toBe('{"__proto__":1,"a":2}');
  });

  it('serializa escalares en la raiz', () => {
    expect(serialize('hola', { indent: 2, sortKeys: false })).toBe('"hola"');
    expect(serialize(null, { indent: 2, sortKeys: false })).toBe('null');
    expect(serialize(42, { indent: 2, sortKeys: false })).toBe('42');
  });

  it('serializa anidamiento profundo sin desbordar la pila', () => {
    const depth = 100_000;
    let deep: unknown = 0;
    for (let level = 0; level < depth; level += 1) deep = { n: deep };

    const output = serialize(deep, { indent: 0, sortKeys: false });
    expect(output.startsWith('{"n":{"n":')).toBe(true);
    expect(output.endsWith('0'.padStart(1, '0') + '}'.repeat(depth))).toBe(true);
  });
});
