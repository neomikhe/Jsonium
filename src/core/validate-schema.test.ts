import { describe, expect, it } from 'vitest';
import { validateSchema } from './validate-schema';

const LIMIT = 50;

function errorsOf(value: unknown, schema: unknown): string[] {
  return validateSchema(value, schema, LIMIT).errors.map((e) => `${e.keyword} ${e.path}`);
}

function isValid(value: unknown, schema: unknown): boolean {
  return validateSchema(value, schema, LIMIT).isValid;
}

describe('validate: type', () => {
  it('acepta el tipo correcto', () => {
    expect(isValid('x', { type: 'string' })).toBe(true);
    expect(isValid(1, { type: 'number' })).toBe(true);
    expect(isValid(null, { type: 'null' })).toBe(true);
    expect(isValid([], { type: 'array' })).toBe(true);
  });

  it('rechaza el tipo incorrecto con su ruta', () => {
    expect(errorsOf({ a: 1 }, { type: 'object', properties: { a: { type: 'string' } } })).toEqual([
      'type $.a',
    ]);
  });

  it('acepta una union de tipos', () => {
    expect(isValid(null, { type: ['string', 'null'] })).toBe(true);
    expect(isValid(1, { type: ['string', 'null'] })).toBe(false);
  });

  it('distingue integer de number', () => {
    expect(isValid(2, { type: 'integer' })).toBe(true);
    expect(isValid(2.5, { type: 'integer' })).toBe(false);
  });
});

describe('validate: objetos', () => {
  it('detecta claves requeridas ausentes', () => {
    expect(errorsOf({ a: 1 }, { required: ['a', 'b', 'c'] })).toEqual(['required $', 'required $']);
  });

  it('acepta null como valor de una clave requerida', () => {
    expect(isValid({ a: null }, { required: ['a'] })).toBe(true);
  });

  it('rechaza claves extra con additionalProperties false', () => {
    const schema = { properties: { a: {} }, additionalProperties: false };
    expect(errorsOf({ a: 1, b: 2 }, schema)).toEqual(['additionalProperties $']);
  });

  it('valida las claves extra contra el esquema de additionalProperties', () => {
    const schema = { properties: {}, additionalProperties: { type: 'string' } };
    expect(errorsOf({ x: 1 }, schema)).toEqual(['type $.x']);
  });

  it('desciende por objetos anidados', () => {
    const schema = {
      properties: { a: { properties: { b: { type: 'string' } } } },
    };
    expect(errorsOf({ a: { b: 1 } }, schema)).toEqual(['type $.a.b']);
  });
});

describe('validate: arrays', () => {
  it('valida cada elemento contra items', () => {
    expect(errorsOf([1, 'x', 3], { items: { type: 'number' } })).toEqual(['type $[1]']);
  });

  it('respeta minItems y maxItems', () => {
    expect(errorsOf([1], { minItems: 2 })).toEqual(['minItems $']);
    expect(errorsOf([1, 2, 3], { maxItems: 2 })).toEqual(['maxItems $']);
  });

  it('detecta elementos repetidos con uniqueItems', () => {
    expect(errorsOf([1, 2, 1], { uniqueItems: true })).toEqual(['uniqueItems $']);
    expect(isValid([{ a: 1 }, { a: 2 }], { uniqueItems: true })).toBe(true);
    expect(isValid([{ a: 1 }, { a: 1 }], { uniqueItems: true })).toBe(false);
  });
});

describe('validate: numeros', () => {
  it('respeta minimum y maximum inclusivos', () => {
    expect(isValid(5, { minimum: 5 })).toBe(true);
    expect(isValid(5, { maximum: 5 })).toBe(true);
    expect(errorsOf(4, { minimum: 5 })).toEqual(['minimum $']);
    expect(errorsOf(6, { maximum: 5 })).toEqual(['maximum $']);
  });

  it('respeta los limites exclusivos', () => {
    expect(isValid(5, { exclusiveMinimum: 5 })).toBe(false);
    expect(isValid(6, { exclusiveMinimum: 5 })).toBe(true);
    expect(isValid(5, { exclusiveMaximum: 5 })).toBe(false);
  });

  it('respeta multipleOf', () => {
    expect(isValid(9, { multipleOf: 3 })).toBe(true);
    expect(errorsOf(10, { multipleOf: 3 })).toEqual(['multipleOf $']);
  });
});

describe('validate: cadenas', () => {
  it('respeta minLength y maxLength', () => {
    expect(errorsOf('ab', { minLength: 3 })).toEqual(['minLength $']);
    expect(errorsOf('abcd', { maxLength: 3 })).toEqual(['maxLength $']);
  });

  it('comprueba pattern', () => {
    expect(isValid('abc123', { pattern: '^[a-z]+[0-9]+$' })).toBe(true);
    expect(errorsOf('ABC', { pattern: '^[a-z]+$' })).toEqual(['pattern $']);
  });

  it('avisa si el patron del esquema no es valido', () => {
    expect(errorsOf('x', { pattern: '[' })).toEqual(['pattern $']);
  });
});

describe('validate: enum, const y combinadores', () => {
  it('comprueba enum por valor estructural', () => {
    expect(isValid('b', { enum: ['a', 'b'] })).toBe(true);
    expect(errorsOf('c', { enum: ['a', 'b'] })).toEqual(['enum $']);
    expect(isValid({ a: 1 }, { enum: [{ a: 1 }] })).toBe(true);
  });

  it('comprueba const', () => {
    expect(isValid(null, { const: null })).toBe(true);
    expect(errorsOf(1, { const: 2 })).toEqual(['const $']);
  });

  it('anyOf pasa si alguna rama cumple', () => {
    const schema = { anyOf: [{ type: 'string' }, { type: 'number' }] };
    expect(isValid('x', schema)).toBe(true);
    expect(errorsOf(true, schema)).toEqual(['anyOf $']);
  });

  it('allOf exige todas las ramas', () => {
    const schema = { allOf: [{ type: 'number' }, { minimum: 5 }] };
    expect(isValid(6, schema)).toBe(true);
    expect(errorsOf(4, schema)).toEqual(['allOf $']);
  });

  it('las ramas se evaluan aisladas: sus errores no afloran fuera', () => {
    const result = validateSchema(4, { allOf: [{ minimum: 5 }] }, LIMIT);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.keyword).toBe('allOf');
    expect(result.errors[0]?.detail).toBe('0/1');
  });

  it('oneOf exige exactamente una rama', () => {
    const schema = { oneOf: [{ type: 'number' }, { minimum: 0 }] };
    expect(errorsOf(5, schema)).toEqual(['oneOf $']);
    expect(isValid('x', { oneOf: [{ type: 'string' }, { type: 'number' }] })).toBe(true);
  });
});

describe('validate: robustez', () => {
  it('rechaza un esquema que no es objeto', () => {
    expect(errorsOf({}, 'no soy un esquema')).toEqual(['schema $']);
  });

  it('un esquema vacio acepta cualquier cosa', () => {
    expect(isValid({ a: [1, { b: null }] }, {})).toBe(true);
  });

  it('corta en el limite y lo senala', () => {
    const schema = { items: { type: 'string' } };
    const result = validateSchema(Array.from({ length: 100 }, (_, i) => i), schema, 5);

    expect(result.errors).toHaveLength(5);
    expect(result.isTruncated).toBe(true);
  });

  it('valida anidamiento profundo sin desbordar la pila', () => {
    const depth = 20_000;
    let value: unknown = 1;
    for (let level = 0; level < depth; level += 1) value = { next: value };

    expect(() => validateSchema(value, { type: 'object' }, LIMIT)).not.toThrow();
  });

  it('trata __proto__ como una clave normal', () => {
    const parsed: unknown = JSON.parse('{"__proto__": 1}');
    const schema = { properties: { __proto__: { type: 'string' } } };

    expect(errorsOf(parsed, schema)).toEqual(['type $.__proto__']);
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('el resultado dice si es valido', () => {
    expect(validateSchema({ a: 1 }, { required: ['a'] }, LIMIT).isValid).toBe(true);
    expect(validateSchema({}, { required: ['a'] }, LIMIT).isValid).toBe(false);
  });
});
