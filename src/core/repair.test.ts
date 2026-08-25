import { describe, expect, it } from 'vitest';
import type { RepairKind } from './repair';
import { repair } from './repair';

function kinds(source: string): RepairKind[] {
  return repair(source)
    .fixes.map((fix) => fix.kind)
    .sort();
}

function repaired(source: string): unknown {
  return JSON.parse(repair(source).text);
}

describe('repair: no toca JSON valido', () => {
  it('devuelve el texto intacto y sin correcciones', () => {
    const valid = '{"a":1,"b":[1,2],"c":"texto","d":null,"e":true}';
    expect(repair(valid).text).toBe(valid);
    expect(repair(valid).fixes).toEqual([]);
  });

  it('conserva escapes y unicode', () => {
    const valid = '{"a":"linea\\nsalto \\u00e9 \\"comilla\\" \\\\ barra"}';
    expect(repair(valid).text).toBe(valid);
    expect(repaired(valid)).toEqual(JSON.parse(valid));
  });
});

describe('repair: comas finales', () => {
  it('quita la coma final de objetos y arrays', () => {
    expect(repaired('{"a":1,}')).toEqual({ a: 1 });
    expect(repaired('[1,2,]')).toEqual([1, 2]);
    expect(kinds('{"a":[1,2,],}')).toEqual(['trailingComma']);
  });

  it('tolera espacios y saltos antes del cierre', () => {
    expect(repaired('{"a":1,\n  \n}')).toEqual({ a: 1 });
  });
});

describe('repair: comillas', () => {
  it('convierte comillas simples en dobles', () => {
    expect(repaired("{'a':'hola'}")).toEqual({ a: 'hola' });
    expect(kinds("{'a':'hola'}")).toEqual(['singleQuote']);
  });

  it('escapa comillas dobles dentro de una cadena de comillas simples', () => {
    expect(repaired(`{'a':'dijo "hola"'}`)).toEqual({ a: 'dijo "hola"' });
  });

  it('desescapa la comilla simple escapada', () => {
    expect(repaired("{'a':'d\\'acuerdo'}")).toEqual({ a: "d'acuerdo" });
  });

  it('convierte comillas tipograficas', () => {
    expect(repaired('{\u201ca\u201d:\u201chola\u201d}')).toEqual({ a: 'hola' });
    expect(kinds('{\u201ca\u201d:\u201chola\u201d}')).toEqual(['smartQuote']);
  });
});

describe('repair: claves sin comillas', () => {
  it('entrecomilla claves desnudas', () => {
    expect(repaired('{a:1, b_2:2, $c:3}')).toEqual({ a: 1, b_2: 2, $c: 3 });
    expect(kinds('{a:1}')).toEqual(['unquotedKey']);
  });

  it('no entrecomilla valores desnudos que no son literales conocidos', () => {
    expect(repair('{"a":abc}').fixes).toEqual([]);
  });
});

describe('repair: comentarios', () => {
  it('elimina comentarios de linea', () => {
    expect(repaired('{"a":1} // sobra')).toEqual({ a: 1 });
    expect(repaired('{\n "a":1 // nota\n}')).toEqual({ a: 1 });
  });

  it('elimina comentarios de bloque', () => {
    expect(repaired('{/* nota */"a":1}')).toEqual({ a: 1 });
    expect(kinds('{/* uno */"a":1 /* dos */}')).toEqual(['comment']);
  });

  it('no elimina barras dentro de cadenas', () => {
    expect(repaired('{"url":"http://ejemplo.test/x"}')).toEqual({
      url: 'http://ejemplo.test/x',
    });
    expect(repair('{"a":"/* no es comentario */"}').fixes).toEqual([]);
  });
});

describe('repair: literales de otros lenguajes', () => {
  it('traduce literales de Python y JavaScript', () => {
    expect(repaired('{"a":True,"b":False,"c":None,"d":NaN,"e":undefined}')).toEqual({
      a: true,
      b: false,
      c: null,
      d: null,
      e: null,
    });
  });

  it('no traduce un literal usado como clave', () => {
    expect(repaired('{None:1}')).toEqual({ None: 1 });
    expect(kinds('{None:1}')).toEqual(['unquotedKey']);
  });
});

describe('repair: contenido de las cadenas intacto', () => {
  it('no toca comas, comillas ni claves dentro de una cadena', () => {
    const source = `{'texto':'llaves {a:1,} y comilla simple no escapada'}`;
    expect(repaired(source)).toEqual({
      texto: 'llaves {a:1,} y comilla simple no escapada',
    });
  });
});

describe('repair: caso combinado', () => {
  it('arregla varios problemas a la vez', () => {
    const broken = `{
      // configuracion
      name: 'jsonium',
      tags: ['a', 'b',],
      active: True,
      /* pendiente */
      count: 3,
    }`;
    expect(repaired(broken)).toEqual({
      name: 'jsonium',
      tags: ['a', 'b'],
      active: true,
      count: 3,
    });
    expect(kinds(broken)).toEqual(['comment', 'literal', 'singleQuote', 'trailingComma', 'unquotedKey']);
  });

  it('informa del numero de correcciones por tipo', () => {
    const fixes = repair('{a:1, b:2, c:3,}').fixes;
    expect(fixes).toContainEqual({ kind: 'unquotedKey', count: 3 });
    expect(fixes).toContainEqual({ kind: 'trailingComma', count: 1 });
  });
});

describe('repair: robustez', () => {
  it('termina con entrada truncada', () => {
    expect(() => repair('{"a":"sin cerrar')).not.toThrow();
    expect(() => repair('{/* sin cerrar')).not.toThrow();
    expect(() => repair("{'a':")).not.toThrow();
  });

  it('procesa entradas grandes en tiempo lineal', () => {
    const source = `{${Array.from({ length: 20_000 }, (_, i) => `k${i}: 'v${i}',`).join('')}}`;
    const startedAt = performance.now();
    const result = repair(source);
    expect(performance.now() - startedAt).toBeLessThan(1000);
    expect(Object.keys(JSON.parse(result.text) as object)).toHaveLength(20_000);
  });
});
