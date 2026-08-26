import { describe, expect, it } from 'vitest';
import { collectTypes, generateTypes } from './codegen';
import { inferSchema } from './infer-schema';

function typesFor(value: unknown, language: 'typescript' | 'go' | 'python' | 'rust'): string {
  return generateTypes(inferSchema(value).schema, language);
}

const SAMPLE = {
  users: [
    { id: 1, fullName: 'Ada', address: { city: 'Oporto' } },
    { id: 2, fullName: 'Linus', address: { city: 'Vigo' }, nickname: 'Linus' },
  ],
  total: 2,
};

describe('codegen: recoleccion de tipos', () => {
  it('nombra la raiz y singulariza los elementos de un array', () => {
    const names = collectTypes(inferSchema(SAMPLE).schema).map((type) => type.name);
    expect(names).toEqual(['Root', 'User', 'Address']);
  });

  it('evita colisiones de nombres', () => {
    const value = { a: { thing: { x: 1 } }, b: { thing: { y: 1 } } };
    const names = collectTypes(inferSchema(value).schema).map((type) => type.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('devuelve vacio si el esquema no es objeto', () => {
    expect(collectTypes('no soy un esquema')).toEqual([]);
    expect(collectTypes(null)).toEqual([]);
  });
});

describe('codegen: TypeScript', () => {
  it('genera interfaces con opcionales y arrays', () => {
    const output = typesFor(SAMPLE, 'typescript');

    expect(output).toContain('export interface Root {');
    expect(output).toContain('users: User[];');
    expect(output).toContain('total: number;');
    expect(output).toContain('nickname?: string;');
    expect(output).toContain('address: Address;');
  });

  it('entrecomilla las claves que no son identificadores', () => {
    expect(typesFor({ 'con espacio': 1 }, 'typescript')).toContain('"con espacio": number;');
  });
});

describe('codegen: Go', () => {
  it('genera structs con etiquetas json', () => {
    const output = typesFor(SAMPLE, 'go');

    expect(output).toContain('type Root struct {');
    expect(output).toContain('Users []User `json:"users"`');
    expect(output).toContain('Total float64 `json:"total"`');
  });

  it('marca los opcionales como puntero con omitempty', () => {
    const output = typesFor(SAMPLE, 'go');
    expect(output).toContain('Nickname *string `json:"nickname,omitempty"`');
  });
});

describe('codegen: Python', () => {
  it('genera dataclasses con snake_case y opcionales', () => {
    const output = typesFor(SAMPLE, 'python');

    expect(output).toContain('@dataclass');
    expect(output).toContain('class Root:');
    expect(output).toContain('users: list[User]');
    expect(output).toContain('full_name: str');
    expect(output).toContain('nickname: str | None = None');
  });
});

describe('codegen: Rust', () => {
  it('genera structs con serde y Option', () => {
    const output = typesFor(SAMPLE, 'rust');

    expect(output).toContain('pub struct Root {');
    expect(output).toContain('pub users: Vec<User>,');
    expect(output).toContain('pub total: f64,');
    expect(output).toContain('pub nickname: Option<String>,');
  });
});

describe('codegen: casos limite', () => {
  it('un documento escalar no genera tipos', () => {
    expect(typesFor(42, 'typescript')).toBe('');
  });

  it('trata los tipos mixtos como desconocidos', () => {
    const output = typesFor({ v: 1 }, 'typescript');
    expect(output).toContain('v: number;');

    const mixed = typesFor([{ v: 1 }, { v: 'x' }], 'typescript');
    expect(mixed).toContain('unknown');
  });

  it('acota el numero de tipos generados', () => {
    const wide: Record<string, unknown> = {};
    for (let index = 0; index < 400; index += 1) wide[`k${index}`] = { nested: index };
    expect(collectTypes(inferSchema(wide).schema).length).toBeLessThanOrEqual(200);
  });

  it('trata __proto__ como una propiedad normal', () => {
    const parsed: unknown = JSON.parse('{"__proto__": 1}');
    expect(typesFor(parsed, 'typescript')).toContain('__proto__: number;');
    expect(Object.prototype).not.toHaveProperty('polluted');
  });
});
