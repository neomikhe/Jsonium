import { describe, expect, it } from 'vitest';
import { countChildren, isPlainRecord, kindOf, previewOf } from './json-value';

describe('kindOf', () => {
  it('distingue null de object', () => {
    expect(kindOf(null)).toBe('null');
    expect(kindOf({})).toBe('object');
  });

  it('distingue array de object', () => {
    expect(kindOf([])).toBe('array');
  });

  it('reconoce escalares', () => {
    expect(kindOf('a')).toBe('string');
    expect(kindOf(1)).toBe('number');
    expect(kindOf(true)).toBe('boolean');
  });
});

describe('countChildren', () => {
  it('cuenta elementos de array y claves de objeto', () => {
    expect(countChildren([1, 2, 3])).toBe(3);
    expect(countChildren({ a: 1, b: 2 })).toBe(2);
  });

  it('devuelve 0 para escalares', () => {
    expect(countChildren('texto')).toBe(0);
    expect(countChildren(null)).toBe(0);
  });
});

describe('previewOf', () => {
  it('resume contenedores por tamano', () => {
    expect(previewOf([1, 2])).toBe('[ 2 ]');
    expect(previewOf({ a: 1 })).toBe('{ 1 }');
  });

  it('trunca cadenas largas', () => {
    const preview = previewOf('x'.repeat(200));
    expect(preview.length).toBeLessThanOrEqual(50);
    expect(preview.endsWith('\u2026')).toBe(true);
  });

  it('escapa cadenas en lugar de interpolarlas', () => {
    expect(previewOf('<img onerror=alert(1)>')).toBe('"<img onerror=alert(1)>"');
  });
});

describe('isPlainRecord', () => {
  it('rechaza null y arrays', () => {
    expect(isPlainRecord(null)).toBe(false);
    expect(isPlainRecord([])).toBe(false);
    expect(isPlainRecord({})).toBe(true);
  });
});
