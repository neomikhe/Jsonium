import { describe, expect, it } from 'vitest';
import { inferSchema } from './infer-schema';
import { generateMock } from './mock';
import { validateSchema } from './validate-schema';

const OPTIONS = { count: 3, seed: 42 };

function mockFrom(value: unknown, count = 3): unknown {
  return generateMock(inferSchema(value).schema, { count, seed: 42 });
}

describe('mock: tipos basicos', () => {
  it('respeta el tipo de cada propiedad', () => {
    const mock = mockFrom({ texto: 'x', numero: 1, bandera: true, nada: null }) as Record<
      string,
      unknown
    >;

    expect(typeof mock['texto']).toBe('string');
    expect(typeof mock['numero']).toBe('number');
    expect(typeof mock['bandera']).toBe('boolean');
    expect(mock['nada']).toBeNull();
  });

  it('genera el numero de elementos pedido', () => {
    const mock = mockFrom({ items: [1, 2] }, 7) as Record<string, unknown[]>;
    expect(mock['items']).toHaveLength(7);
  });

  it('devuelve null si el esquema no es objeto', () => {
    expect(generateMock('no soy un esquema', OPTIONS)).toBeNull();
  });
});

describe('mock: pistas por nombre de clave', () => {
  it('usa correos de dominio reservado', () => {
    const mock = mockFrom({ email: 'a@b.c' }) as Record<string, string>;
    expect(mock['email']).toMatch(/@example\.invalid$/);
  });

  it('usa nombres y ciudades plausibles', () => {
    const mock = mockFrom({ name: 'x', city: 'y' }) as Record<string, string>;
    expect(mock['name']).toMatch(/^[A-Z]/);
    expect(mock['city']).toMatch(/^[A-Z]/);
  });

  it('usa fechas ISO para claves de fecha', () => {
    const mock = mockFrom({ createdAt: '2020-01-01T00:00:00.000Z' }) as Record<string, string>;
    expect(() => new Date(mock['createdAt'] ?? '').toISOString()).not.toThrow();
    expect(mock['createdAt']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('las URLs apuntan a un dominio reservado', () => {
    const mock = mockFrom({ url: 'https://algo' }) as Record<string, string>;
    expect(mock['url']).toContain('example.invalid');
  });
});

describe('mock: determinismo', () => {
  it('la misma semilla produce el mismo resultado', () => {
    const schema = inferSchema({ users: [{ id: 1, name: 'Ada' }] }).schema;
    const uno = generateMock(schema, { count: 3, seed: 7 });
    const dos = generateMock(schema, { count: 3, seed: 7 });

    expect(JSON.stringify(uno)).toBe(JSON.stringify(dos));
  });

  it('semillas distintas producen resultados distintos', () => {
    const schema = inferSchema({ users: [{ id: 1, name: 'Ada' }] }).schema;
    const uno = generateMock(schema, { count: 5, seed: 1 });
    const dos = generateMock(schema, { count: 5, seed: 2 });

    expect(JSON.stringify(uno)).not.toBe(JSON.stringify(dos));
  });
});

describe('mock: respeta las restricciones del esquema', () => {
  it('elige un valor de enum', () => {
    const schema = { type: 'object', properties: { estado: { enum: ['alta', 'baja'] } } };
    const mock = generateMock(schema, OPTIONS) as Record<string, string>;
    expect(['alta', 'baja']).toContain(mock['estado']);
  });

  it('usa const tal cual', () => {
    const schema = { type: 'object', properties: { version: { const: 3 } } };
    expect((generateMock(schema, OPTIONS) as Record<string, unknown>)['version']).toBe(3);
  });

  it('respeta minimum y maximum', () => {
    const schema = {
      type: 'object',
      properties: { edad: { type: 'integer', minimum: 18, maximum: 20 } },
    };
    for (let seed = 0; seed < 20; seed += 1) {
      const mock = generateMock(schema, { count: 1, seed }) as Record<string, number>;
      expect(mock['edad']).toBeGreaterThanOrEqual(18);
      expect(mock['edad']).toBeLessThanOrEqual(20);
    }
  });

  it('respeta minLength y maxLength', () => {
    const schema = {
      type: 'object',
      properties: { corto: { type: 'string', maxLength: 4 }, largo: { type: 'string', minLength: 30 } },
    };
    const mock = generateMock(schema, OPTIONS) as Record<string, string>;
    expect(mock['corto']?.length).toBeLessThanOrEqual(4);
    expect(mock['largo']?.length).toBeGreaterThanOrEqual(30);
  });

  it('respeta minItems y maxItems', () => {
    const schema = {
      type: 'object',
      properties: { pocos: { type: 'array', maxItems: 2, items: { type: 'number' } } },
    };
    const mock = generateMock(schema, { count: 50, seed: 1 }) as Record<string, unknown[]>;
    expect(mock['pocos']?.length).toBeLessThanOrEqual(2);
  });
});

describe('mock: el resultado valida contra su propio esquema', () => {
  it('un mock generado desde un esquema lo cumple', () => {
    const source = {
      users: [{ id: 1, name: 'Ada', email: 'a@b.c', activo: true }],
      total: 2,
    };
    const schema = inferSchema(source).schema;
    const mock = generateMock(schema, { count: 4, seed: 3 });

    expect(validateSchema(mock, schema, 20).isValid).toBe(true);
  });

  it('es JSON serializable', () => {
    const mock = mockFrom({ a: [{ b: 1 }], c: null });
    expect(() => JSON.stringify(mock)).not.toThrow();
  });
});
