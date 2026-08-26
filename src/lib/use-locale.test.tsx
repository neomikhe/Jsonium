/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocale } from './use-locale';

const STORAGE_KEY = 'jsonium.locale';

describe('useLocale', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('arranca en la lengua del navegador cuando no hay eleccion guardada', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-ES');
    const { result } = renderHook(() => useLocale());
    expect(result.current.locale).toBe('es');
  });

  it('un navegador en otra lengua arranca en ingles', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
    const { result } = renderHook(() => useLocale());
    expect(result.current.locale).toBe('en');
  });

  it('la eleccion guardada gana a la del navegador', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-ES');
    window.localStorage.setItem(STORAGE_KEY, 'en');
    const { result } = renderHook(() => useLocale());
    expect(result.current.locale).toBe('en');
    expect(result.current.messages.locale).toBe('en');
  });

  it('un valor corrupto en el almacenamiento se ignora', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-ES');
    window.localStorage.setItem(STORAGE_KEY, 'klingon');
    const { result } = renderHook(() => useLocale());
    expect(result.current.locale).toBe('es');
  });

  it('conmutar cambia el catalogo y recuerda la eleccion', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-ES');
    const { result } = renderHook(() => useLocale());

    act(() => {
      result.current.toggle();
    });

    expect(result.current.locale).toBe('en');
    expect(result.current.messages.format).toBe('Format');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('en');
  });

  it('el idioma llega al atributo lang del documento', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-ES');
    const { result } = renderHook(() => useLocale());
    expect(document.documentElement.lang).toBe('es');

    act(() => {
      result.current.toggle();
    });

    expect(document.documentElement.lang).toBe('en');
  });

  it('sobrevive a un almacenamiento bloqueado', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const { result } = renderHook(() => useLocale());
    expect(result.current.locale).toBe('en');

    act(() => {
      result.current.toggle();
    });

    expect(result.current.locale).toBe('es');
  });
});
