import { describe, expect, it } from 'vitest';
import { SHARE_MAX_CHARS } from '../core/limits';
import { decodeShare, encodeShare } from './share-url';

describe('share-url', () => {
  it('hace ida y vuelta conservando el texto', () => {
    const text = JSON.stringify({ a: 1, b: ['x', null, true] }, null, 2);
    const { hash } = encodeShare(text);

    expect(hash).not.toBeNull();
    expect(decodeShare(hash ?? '')).toBe(text);
  });

  it('conserva acentos y emoji', () => {
    const text = '{"saludo":"acentos áéí y emoji \u2728"}';
    const { hash } = encodeShare(text);
    expect(decodeShare(hash ?? '')).toBe(text);
  });

  it('comprime de verdad', () => {
    const text = JSON.stringify(
      Array.from({ length: 200 }, (_, i) => ({ id: i, nombre: `usuario ${i}`, activo: true })),
    );
    const { hash } = encodeShare(text);
    expect((hash ?? '').length).toBeLessThan(text.length);
  });

  it('produce un hash apto para una URL', () => {
    const { hash } = encodeShare('{"a":1}');
    expect(hash).toMatch(/^#d=[A-Za-z0-9+\-$]*$/);
  });

  it('rechaza el texto vacio', () => {
    expect(encodeShare('   ').hash).toBeNull();
    expect(encodeShare('   ').reason).toBe('No hay nada que compartir');
  });

  it('rechaza lo que no cabe en una URL', () => {
    const huge = 'x'.repeat(SHARE_MAX_CHARS + 1);
    expect(encodeShare(huge).hash).toBeNull();
    expect(encodeShare(huge).reason).toContain('demasiado grande');
  });

  it('ignora hashes ajenos o corruptos', () => {
    expect(decodeShare('')).toBeNull();
    expect(decodeShare('#otracosa')).toBeNull();
    expect(decodeShare('#d=')).toBeNull();
    expect(decodeShare('#d=!!!basura!!!')).toBeNull();
  });
});
