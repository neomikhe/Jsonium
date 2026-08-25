import { describe, expect, it } from 'vitest';
import { analyzeConversion } from './convert';
import type { LossKind } from './convert';

function kindsOf(value: unknown, format: 'yaml' | 'toml' | 'csv'): LossKind[] {
  return analyzeConversion(value, format).map((entry) => entry.kind);
}

function pathsOf(value: unknown, format: 'yaml' | 'toml' | 'csv', kind: LossKind): string[] {
  return analyzeConversion(value, format)
    .filter((entry) => entry.kind === kind)
    .map((entry) => entry.path);
}

describe('conversion a YAML', () => {
  it('no pierde nada: JSON es un subconjunto de YAML', () => {
    expect(kindsOf({ a: 1, b: null, c: [{ d: 'x' }] }, 'yaml')).toEqual([]);
    expect(kindsOf([1, 2, 3], 'yaml')).toEqual([]);
    expect(kindsOf('escalar', 'yaml')).toEqual([]);
  });
});

describe('conversion a TOML', () => {
  it('exige un objeto en la raiz', () => {
    expect(kindsOf([1, 2], 'toml')).toEqual(['tomlRootNotTable']);
    expect(kindsOf('texto', 'toml')).toEqual(['tomlRootNotTable']);
    expect(kindsOf(null, 'toml')).toEqual(['tomlRootNotTable']);
  });

  it('avisa de cada null porque TOML los descarta en silencio', () => {
    expect(pathsOf({ a: 1, b: null }, 'toml', 'tomlNullDropped')).toEqual(['$.b']);
  });

  it('encuentra los null anidados en objetos y arrays', () => {
    const value = { a: { b: null }, c: [1, null], d: 'x' };
    expect(pathsOf(value, 'toml', 'tomlNullDropped')).toEqual(['$.a.b', '$.c[1]']);
  });

  it('no avisa cuando no hay null', () => {
    expect(kindsOf({ a: 1, b: { c: [1, 2] } }, 'toml')).toEqual([]);
  });
});

describe('conversion a CSV', () => {
  it('exige un array en la raiz', () => {
    expect(kindsOf({ a: 1 }, 'csv')).toEqual(['csvRootNotRowArray']);
  });

  it('exige que cada fila sea un objeto', () => {
    const losses = analyzeConversion([{ a: 1 }, 5], 'csv');
    expect(losses[0]?.kind).toBe('csvRowNotObject');
    expect(losses[0]?.path).toBe('$[1]');
  });

  it('un array vacio no pierde nada', () => {
    expect(kindsOf([], 'csv')).toEqual([]);
  });

  it('avisa siempre de la perdida de tipos', () => {
    expect(kindsOf([{ a: 1 }], 'csv')).toEqual(['csvTypesLost']);
  });

  it('avisa de valores anidados con su ruta', () => {
    const rows = [{ a: 1, b: { n: 1 } }, { a: 2, b: [1, 2] }];
    expect(pathsOf(rows, 'csv', 'csvNestedValue')).toEqual(['$[0].b', '$[1].b']);
  });

  it('avisa de filas con claves distintas', () => {
    expect(kindsOf([{ a: 1 }, { b: 2 }], 'csv')).toContain('csvRaggedRows');
  });

  it('no avisa de filas irregulares cuando todas comparten claves', () => {
    expect(kindsOf([{ a: 1, b: 2 }, { a: 3, b: 4 }], 'csv')).not.toContain('csvRaggedRows');
  });
});

describe('conversion: limites', () => {
  it('acota el numero de avisos', () => {
    const value = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, null]));
    expect(analyzeConversion(value, 'toml').length).toBeLessThanOrEqual(50);
  });

  it('recorre anidamiento profundo sin desbordar la pila', () => {
    const depth = 50_000;
    let deep: unknown = null;
    for (let level = 0; level < depth; level += 1) deep = { next: deep };

    expect(() => analyzeConversion(deep, 'toml')).not.toThrow();
    expect(analyzeConversion(deep, 'toml')).toHaveLength(1);
  });
});
