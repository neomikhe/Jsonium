import { describe, expect, it } from 'vitest';
import { inferSchema } from './infer-schema';

function schemaOf(value: unknown): Record<string, unknown> {
  return inferSchema(value).schema;
}

describe('inferSchema: escalares y raiz', () => {
  it('anota el dialecto', () => {
    expect(schemaOf(1)['$schema']).toBe('http://json-schema.org/draft-07/schema#');
  });

  it('infiere tipos escalares', () => {
    expect(schemaOf('x')['type']).toBe('string');
    expect(schemaOf(1)['type']).toBe('number');
    expect(schemaOf(true)['type']).toBe('boolean');
    expect(schemaOf(null)['type']).toBe('null');
  });
});

describe('inferSchema: objetos', () => {
  it('infiere propiedades y las marca requeridas', () => {
    const schema = schemaOf({ a: 1, b: 'x' });
    expect(schema['type']).toBe('object');
    expect(schema['properties']).toEqual({ a: { type: 'number' }, b: { type: 'string' } });
    expect(schema['required']).toEqual(['a', 'b']);
  });

  it('desciende por objetos anidados', () => {
    const schema = schemaOf({ a: { b: { c: 1 } } });
    const a = (schema['properties'] as Record<string, Record<string, unknown>>)['a'];
    expect(a?.['type']).toBe('object');
  });

  it('un objeto vacio no tiene propiedades', () => {
    const schema = schemaOf({});
    expect(schema['type']).toBe('object');
    expect(schema['properties']).toBeUndefined();
  });
});

describe('inferSchema: arrays', () => {
  it('infiere el esquema de los elementos', () => {
    const schema = schemaOf([1, 2, 3]);
    expect(schema['type']).toBe('array');
    expect(schema['items']).toEqual({ type: 'number' });
  });

  it('fusiona los objetos de un array en un solo items', () => {
    const schema = schemaOf([{ id: 1, name: 'a' }, { id: 2, name: 'b' }]);
    const items = schema['items'] as Record<string, unknown>;

    expect(items['type']).toBe('object');
    expect(Object.keys(items['properties'] as object).sort()).toEqual(['id', 'name']);
    expect(items['required']).toEqual(expect.arrayContaining(['id', 'name']));
  });

  it('marca opcional la clave que no esta en todos los elementos', () => {
    const schema = schemaOf([{ id: 1, extra: true }, { id: 2 }]);
    const items = schema['items'] as Record<string, unknown>;

    expect(Object.keys(items['properties'] as object).sort()).toEqual(['extra', 'id']);
    expect(items['required']).toEqual(['id']);
  });

  it('un array vacio no tiene items', () => {
    expect(schemaOf([])['items']).toBeUndefined();
  });
});

describe('inferSchema: tipos mixtos', () => {
  it('une los tipos observados en la misma posicion', () => {
    const schema = schemaOf([1, 'dos', null]);
    expect(schema['items']).toEqual({ type: ['null', 'number', 'string'] });
  });

  it('une los tipos de una propiedad que varia', () => {
    const schema = schemaOf([{ v: 1 }, { v: 'x' }]);
    const items = schema['items'] as Record<string, Record<string, unknown>>;
    expect(items['properties']?.['v']).toEqual({ type: ['number', 'string'] });
  });
});

describe('inferSchema: robustez', () => {
  it('trata __proto__ como una propiedad normal', () => {
    const parsed: unknown = JSON.parse('{"__proto__": 1, "a": 2}');
    const schema = schemaOf(parsed);

    expect(Object.keys(schema['properties'] as object).sort()).toEqual(['__proto__', 'a']);
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('corta el anidamiento profundo y lo senala', () => {
    let deep: unknown = 1;
    for (let level = 0; level < 500; level += 1) deep = { next: deep };

    const result = inferSchema(deep);
    expect(result.isTruncated).toBe(true);
    expect(() => JSON.stringify(result.schema)).not.toThrow();
  });

  it('procesa muchos elementos en tiempo razonable', () => {
    const rows = Array.from({ length: 20_000 }, (_, i) => ({ id: i, name: `n${i}` }));
    const startedAt = performance.now();
    const result = inferSchema(rows);

    expect(performance.now() - startedAt).toBeLessThan(2000);
    expect(result.isTruncated).toBe(false);
    expect((result.schema['items'] as Record<string, unknown>)['required']).toEqual(
      expect.arrayContaining(['id', 'name']),
    );
  });

  it('el esquema resultante es JSON serializable', () => {
    const schema = schemaOf({ a: [{ b: 1 }], c: null });
    expect(JSON.parse(JSON.stringify(schema))).toEqual(schema);
  });
});
