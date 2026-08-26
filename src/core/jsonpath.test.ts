import { describe, expect, it } from 'vitest';
import { DocumentFailure } from './failure';
import { queryPath } from './jsonpath';

const LIMIT = 100;

const DOC = {
  store: {
    book: [
      { title: 'Sayings', author: 'Nigel', price: 8.95 },
      { title: 'Sword', author: 'Evelyn', price: 12.99 },
      { title: 'Moby', author: 'Melville', price: 8.99 },
    ],
    bicycle: { color: 'red', price: 19.95 },
  },
  'clave rara': { nested: 1 },
};

function paths(expression: string, root: unknown = DOC): string[] {
  return queryPath(root, expression, LIMIT).matches.map((match) => match.path);
}

function previews(expression: string, root: unknown = DOC): string[] {
  return queryPath(root, expression, LIMIT).matches.map((match) => match.preview);
}

describe('jsonpath: navegacion basica', () => {
  it('devuelve la raiz', () => {
    expect(paths('$')).toEqual(['$']);
  });

  it('baja por claves', () => {
    expect(paths('$.store.bicycle.color')).toEqual(['$.store.bicycle.color']);
    expect(previews('$.store.bicycle.color')).toEqual(['"red"']);
  });

  it('acepta corchetes con comillas', () => {
    expect(paths("$['store']['bicycle']['color']")).toEqual(['$.store.bicycle.color']);
    expect(paths('$["clave rara"].nested')).toEqual(['$["clave rara"].nested']);
  });

  it('devuelve vacio si la clave no existe', () => {
    expect(paths('$.store.noexiste')).toEqual([]);
  });
});

describe('jsonpath: indices y rangos', () => {
  it('accede por indice', () => {
    expect(previews('$.store.book[0].title')).toEqual(['"Sayings"']);
  });

  it('acepta indices negativos', () => {
    expect(previews('$.store.book[-1].title')).toEqual(['"Moby"']);
  });

  it('corta con un rango', () => {
    expect(paths('$.store.book[0:2]')).toEqual(['$.store.book[0]', '$.store.book[1]']);
  });

  it('acepta rangos abiertos', () => {
    expect(paths('$.store.book[1:]')).toHaveLength(2);
    expect(paths('$.store.book[:1]')).toEqual(['$.store.book[0]']);
  });

  it('devuelve vacio con un indice fuera de rango', () => {
    expect(paths('$.store.book[9]')).toEqual([]);
  });
});

describe('jsonpath: comodines', () => {
  it('expande todos los hijos de un array', () => {
    expect(paths('$.store.book[*].author')).toEqual([
      '$.store.book[0].author',
      '$.store.book[1].author',
      '$.store.book[2].author',
    ]);
  });

  it('expande todos los hijos de un objeto', () => {
    expect(paths('$.store.*')).toEqual(['$.store.book', '$.store.bicycle']);
  });

  it('acepta la forma con punto', () => {
    expect(paths('$.store.book[0].*')).toHaveLength(3);
  });
});

describe('jsonpath: descenso recursivo', () => {
  it('encuentra una clave a cualquier profundidad', () => {
    expect(paths('$..price')).toEqual([
      '$.store.book[0].price',
      '$.store.book[1].price',
      '$.store.book[2].price',
      '$.store.bicycle.price',
    ]);
  });

  it('no se devuelve a si mismo', () => {
    expect(paths('$..store')).toEqual(['$.store']);
  });

  it('devuelve vacio si nada coincide', () => {
    expect(paths('$..noexiste')).toEqual([]);
  });
});

function failureOf(expression: string): { code: string; detail: string } | null {
  try {
    queryPath(DOC, expression, LIMIT);
    return null;
  } catch (cause) {
    return cause instanceof DocumentFailure ? { code: cause.code, detail: detailOf(cause) } : null;
  }
}

function detailOf(failure: DocumentFailure): string {
  const at = failure.message.indexOf(':');
  return at === -1 ? '' : failure.message.slice(at + 1);
}

describe('jsonpath: errores de sintaxis', () => {
  it('exige empezar por la raiz', () => {
    expect(failureOf('store.book')).toEqual({ code: 'query-root', detail: '' });
  });

  it('rechaza una consulta vacia', () => {
    expect(failureOf('   ')).toEqual({ code: 'query-empty', detail: '' });
  });

  it('avisa del corchete sin cerrar', () => {
    expect(failureOf('$.store.book[0')).toEqual({ code: 'query-bracket', detail: '' });
  });

  it('avisa de un indice no valido y dice cual', () => {
    expect(failureOf('$.store.book[abc]')).toEqual({ code: 'query-index', detail: 'abc' });
  });

  it('avisa de un punto sin nombre', () => {
    expect(failureOf('$.store.')).toEqual({ code: 'query-name-dot', detail: '' });
  });

  it('el fallo viaja como codigo, no como prosa', () => {
    expect(() => queryPath(DOC, '   ', LIMIT)).toThrow('query-empty');
  });
});

describe('jsonpath: limites y robustez', () => {
  it('corta en el limite y lo senala', () => {
    const wide = { items: Array.from({ length: 500 }, (_, i) => ({ n: i })) };
    const result = queryPath(wide, '$.items[*]', 10);

    expect(result.matches).toHaveLength(10);
    expect(result.isTruncated).toBe(true);
  });

  it('el descenso recursivo no desborda la pila', () => {
    const depth = 20_000;
    let deep: unknown = { objetivo: 1 };
    for (let level = 0; level < depth; level += 1) deep = { next: deep };

    expect(queryPath(deep, '$..objetivo', LIMIT).matches).toHaveLength(1);
  });

  it('trata __proto__ como una clave normal', () => {
    const parsed: unknown = JSON.parse('{"__proto__": {"x": 1}}');
    expect(paths('$.__proto__.x', parsed)).toEqual(['$.__proto__.x']);
    expect(Object.prototype).not.toHaveProperty('x');
  });
});
