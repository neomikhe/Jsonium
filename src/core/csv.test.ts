import { describe, expect, it } from 'vitest';
import { fromCsv, toCsv } from './csv';

describe('toCsv', () => {
  it('escribe cabecera y filas', () => {
    expect(toCsv([{ a: 1, b: 'x' }, { a: 2, b: 'y' }])).toBe('a,b\r\n1,x\r\n2,y');
  });

  it('usa la union de claves, no solo las de la primera fila', () => {
    expect(toCsv([{ a: 1 }, { a: 2, b: 3 }])).toBe('a,b\r\n1,\r\n2,3');
  });

  it('entrecomilla comas, comillas y saltos de linea', () => {
    expect(toCsv([{ a: 'con,coma' }])).toBe('a\r\n"con,coma"');
    expect(toCsv([{ a: 'con"comilla' }])).toBe('a\r\n"con""comilla"');
    expect(toCsv([{ a: 'con\nsalto' }])).toBe('a\r\n"con\nsalto"');
  });

  it('guarda lo anidado como texto JSON en vez de perderlo', () => {
    expect(toCsv([{ a: { n: 1 } }])).toBe('a\r\n"{""n"":1}"');
    expect(toCsv([{ a: [1, 2] }])).toBe('a\r\n"[1,2]"');
  });

  it('escribe celdas vacias para las claves ausentes', () => {
    expect(toCsv([{ a: 1, b: 2 }, { a: 3 }])).toBe('a,b\r\n1,2\r\n3,');
  });

  it('devuelve vacio sin filas o sin columnas', () => {
    expect(toCsv([])).toBe('');
    expect(toCsv([{}])).toBe('');
  });

  it('escribe null y booleanos como texto', () => {
    expect(toCsv([{ a: null, b: true }])).toBe('a,b\r\nnull,true');
  });
});

describe('fromCsv', () => {
  it('lee cabecera y filas', () => {
    expect(fromCsv('a,b\r\n1,x')).toEqual([{ a: 1, b: 'x' }]);
  });

  it('acepta saltos de linea unix', () => {
    expect(fromCsv('a,b\n1,x\n2,y')).toEqual([{ a: 1, b: 'x' }, { a: 2, b: 'y' }]);
  });

  it('recupera numeros, booleanos y null', () => {
    expect(fromCsv('n,b,z\r\n42,true,null')).toEqual([{ n: 42, b: true, z: null }]);
  });

  it('lee celdas entrecomilladas con comas y comillas dobladas', () => {
    expect(fromCsv('a\r\n"con,coma"')).toEqual([{ a: 'con,coma' }]);
    expect(fromCsv('a\r\n"con""comilla"')).toEqual([{ a: 'con"comilla' }]);
  });

  it('lee un salto de linea dentro de una celda entrecomillada', () => {
    expect(fromCsv('a,b\r\n"dos\nlineas",x')).toEqual([{ a: 'dos\nlineas', b: 'x' }]);
  });

  it('rellena las celdas que faltan', () => {
    expect(fromCsv('a,b\r\n1')).toEqual([{ a: 1, b: '' }]);
  });

  it('devuelve vacio con texto vacio', () => {
    expect(fromCsv('')).toEqual([]);
    expect(fromCsv('a,b')).toEqual([]);
  });

  it('no crea claves heredadas del prototipo', () => {
    const rows = fromCsv('__proto__\r\n1');
    expect(rows[0]).toHaveProperty('__proto__');
    expect(Object.prototype).not.toHaveProperty('polluted');
    expect(({}) as Record<string, unknown>).not.toHaveProperty('1');
  });
});

describe('csv: ida y vuelta', () => {
  it('conserva las cadenas dificiles', () => {
    const rows = [{ a: 'con,coma', b: 'con"comilla', c: 'con\nsalto' }];
    expect(fromCsv(toCsv(rows))).toEqual(rows);
  });

  it('conserva numeros y booleanos', () => {
    const rows = [{ n: 42, f: 1.5, b: false }];
    expect(fromCsv(toCsv(rows))).toEqual(rows);
  });

  it('procesa muchas filas en tiempo lineal', () => {
    const rows = Array.from({ length: 20_000 }, (_, i) => ({ id: i, nombre: `fila ${i}` }));
    const startedAt = performance.now();
    const back = fromCsv(toCsv(rows));
    expect(performance.now() - startedAt).toBeLessThan(2000);
    expect(back).toHaveLength(20_000);
  });
});
