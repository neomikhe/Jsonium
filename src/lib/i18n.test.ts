import { describe, expect, it } from 'vitest';
import { CATALOGUE } from './i18n';

type Shape = Record<string, unknown>;

function shapeOf(value: Shape, prefix = ''): string[] {
  return Object.entries(value)
    .flatMap(([key, entry]) => {
      const path = prefix === '' ? key : `${prefix}.${key}`;
      if (typeof entry === 'object' && entry !== null) return shapeOf(entry as Shape, path);
      return [`${path}:${typeof entry}`];
    })
    .sort();
}

describe('catalogo de mensajes', () => {
  it('las dos lenguas declaran exactamente las mismas claves', () => {
    expect(shapeOf(CATALOGUE.en as unknown as Shape)).toStrictEqual(
      shapeOf(CATALOGUE.es as unknown as Shape),
    );
  });

  it('ningun mensaje queda vacio', () => {
    for (const messages of Object.values(CATALOGUE)) {
      const texts = Object.values(messages as unknown as Shape).filter(
        (value): value is string => typeof value === 'string',
      );
      expect(texts.every((text) => text.trim() !== '')).toBe(true);
    }
  });

  it('las plantillas insertan su argumento', () => {
    expect(CATALOGUE.es.forget('datos.json')).toContain('datos.json');
    expect(CATALOGUE.en.forget('datos.json')).toContain('datos.json');
    expect(CATALOGUE.es.parseFailed('a.json', 'roto')).toContain('roto');
    expect(CATALOGUE.en.parseFailed('a.json', 'broken')).toContain('broken');
  });

  it('cada lengua se identifica a si misma', () => {
    expect(CATALOGUE.es.locale).toBe('es');
    expect(CATALOGUE.en.locale).toBe('en');
  });
});
