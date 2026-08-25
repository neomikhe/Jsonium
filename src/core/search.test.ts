import { describe, expect, it } from 'vitest';
import { pathFrom, segmentOf } from './json-path';
import { search } from './search';

const DOC = {
  users: [
    { name: 'Ada', email: 'ada@example.invalid', active: true },
    { name: 'Linus', email: 'linus@example.invalid', active: false },
  ],
  'clave rara': { nested: 42 },
  total: 2,
};

function paths(query: string, limit = 50): string[] {
  return search(DOC, { query, limit }).matches.map((match) => match.path);
}

describe('segmentOf', () => {
  it('usa notacion de punto para claves simples', () => {
    expect(segmentOf('name', null)).toBe('.name');
    expect(segmentOf('_a$1', null)).toBe('._a$1');
  });

  it('usa corchetes para indices y claves con caracteres raros', () => {
    expect(segmentOf(null, 3)).toBe('[3]');
    expect(segmentOf('clave rara', null)).toBe('["clave rara"]');
    expect(segmentOf('con"comilla', null)).toBe('["con\\"comilla"]');
  });
});

describe('pathFrom', () => {
  it('devuelve la raiz sin enlaces', () => {
    expect(pathFrom(null)).toBe('$');
  });

  it('compone la ruta de padre a hijo', () => {
    const link = {
      parent: { parent: { parent: null, key: 'users', index: null }, key: null, index: 0 },
      key: 'name',
      index: null,
    };
    expect(pathFrom(link)).toBe('$.users[0].name');
  });
});

describe('search', () => {
  it('devuelve vacio con consulta en blanco', () => {
    expect(search(DOC, { query: '   ', limit: 10 }).matches).toEqual([]);
  });

  it('encuentra coincidencias en valores', () => {
    expect(paths('ada')).toEqual(['$.users[0].name', '$.users[0].email']);
  });

  it('encuentra coincidencias en claves', () => {
    expect(paths('email')).toEqual(['$.users[0].email', '$.users[1].email']);
  });

  it('ignora mayusculas y minusculas', () => {
    expect(paths('LINUS')).toEqual(['$.users[1].name', '$.users[1].email']);
  });

  it('recorre en orden de documento', () => {
    expect(paths('nam')).toEqual(['$.users[0].name', '$.users[1].name']);
  });

  it('encuentra booleanos y numeros por su texto', () => {
    expect(paths('false')).toEqual(['$.users[1].active']);
    expect(paths('42')).toEqual(['$["clave rara"].nested']);
  });

  it('escapa claves con espacios en la ruta', () => {
    expect(paths('rara')).toEqual(['$["clave rara"]']);
  });

  it('marca de donde viene la coincidencia', () => {
    const result = search(DOC, { query: 'total', limit: 10 });
    expect(result.matches[0]?.where).toBe('key');
    const value = search(DOC, { query: 'Ada', limit: 10 });
    expect(value.matches[0]?.where).toBe('value');
  });

  it('corta en el limite y lo senala', () => {
    const result = search(DOC, { query: 'a', limit: 2 });
    expect(result.matches).toHaveLength(2);
    expect(result.isTruncated).toBe(true);
  });

  it('recorre anidamiento profundo sin desbordar la pila', () => {
    const depth = 100_000;
    let deep: unknown = 'aguja';
    for (let level = 0; level < depth; level += 1) deep = { next: deep };

    const result = search(deep, { query: 'aguja', limit: 5 });
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.path.endsWith('.next')).toBe(true);
  });
});
