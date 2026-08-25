import { describe, expect, it } from 'vitest';
import { locatePath } from './locate';

const PRETTY = `{
  "users": [
    { "name": "Ada", "city": "Oporto" },
    { "name": "Linus", "tags": ["a", "b"] }
  ],
  "clave rara": { "nested": 42 },
  "total": 2
}`;

const MINIFIED = JSON.stringify(JSON.parse(PRETTY));

function sliceAt(text: string, path: string): string | null {
  const span = locatePath(text, path);
  return span === null ? null : text.slice(span.from, span.to);
}

describe('locatePath en texto indentado', () => {
  it('localiza la raiz completa', () => {
    expect(sliceAt(PRETTY, '$')).toBe(PRETTY);
  });

  it('localiza un objeto anidado', () => {
    expect(sliceAt(PRETTY, '$.users[0]')).toBe('{ "name": "Ada", "city": "Oporto" }');
  });

  it('localiza un valor de cadena', () => {
    expect(sliceAt(PRETTY, '$.users[0].name')).toBe('"Ada"');
    expect(sliceAt(PRETTY, '$.users[1].name')).toBe('"Linus"');
  });

  it('localiza un array anidado y sus elementos', () => {
    expect(sliceAt(PRETTY, '$.users[1].tags')).toBe('["a", "b"]');
    expect(sliceAt(PRETTY, '$.users[1].tags[1]')).toBe('"b"');
  });

  it('localiza claves con espacios', () => {
    expect(sliceAt(PRETTY, '$["clave rara"]')).toBe('{ "nested": 42 }');
    expect(sliceAt(PRETTY, '$["clave rara"].nested')).toBe('42');
  });

  it('localiza un numero al final del objeto', () => {
    expect(sliceAt(PRETTY, '$.total')).toBe('2');
  });

  it('devuelve null para rutas inexistentes', () => {
    expect(locatePath(PRETTY, '$.noexiste')).toBeNull();
    expect(locatePath(PRETTY, '$.users[9]')).toBeNull();
  });
});

describe('locatePath en texto minificado', () => {
  it('localiza las mismas rutas', () => {
    expect(sliceAt(MINIFIED, '$.users[0].name')).toBe('"Ada"');
    expect(sliceAt(MINIFIED, '$["clave rara"].nested')).toBe('42');
    expect(sliceAt(MINIFIED, '$.total')).toBe('2');
  });
});

describe('locatePath: casos delicados', () => {
  it('no confunde llaves ni corchetes dentro de cadenas', () => {
    const text = '{"a":"{\\"b\\":[1,2]}","b":7}';
    expect(sliceAt(text, '$.b')).toBe('7');
  });

  it('no confunde comillas escapadas', () => {
    const text = '{"a":"dijo \\"hola\\"","b":true}';
    expect(sliceAt(text, '$.b')).toBe('true');
    expect(sliceAt(text, '$.a')).toBe('"dijo \\"hola\\""');
  });

  it('maneja contenedores vacios', () => {
    const text = '{"a":{},"b":[],"c":1}';
    expect(sliceAt(text, '$.a')).toBe('{}');
    expect(sliceAt(text, '$.b')).toBe('[]');
    expect(sliceAt(text, '$.c')).toBe('1');
  });

  it('maneja numeros negativos y exponenciales', () => {
    const text = '{"a":-1.5e10,"b":null}';
    expect(sliceAt(text, '$.a')).toBe('-1.5e10');
    expect(sliceAt(text, '$.b')).toBe('null');
  });

  it('recorre anidamiento profundo sin desbordar la pila', () => {
    const depth = 5000;
    const text = `${'{"n":'.repeat(depth)}1${'}'.repeat(depth)}`;
    const target = `$${'.n'.repeat(depth)}`;
    expect(sliceAt(text, target)).toBe('1');
  });

  it('no se cuelga con texto truncado', () => {
    expect(() => locatePath('{"a":[1,2', '$.a')).not.toThrow();
    expect(() => locatePath('{"a":"sin cerrar', '$.b')).not.toThrow();
  });
});
