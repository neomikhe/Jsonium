/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyStoredTheme, useTheme } from './use-theme';

const STORAGE_KEY = 'jsonium.theme';

function attribute(): string | null {
  return document.documentElement.getAttribute('data-theme');
}

describe('useTheme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('sin eleccion guardada sigue al sistema y no marca el documento', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('system');
    expect(attribute()).toBeNull();
  });

  it('cicla sistema, claro, oscuro y vuelve', () => {
    const { result } = renderHook(() => useTheme());
    const seen: string[] = [];

    for (let step = 0; step < 3; step += 1) {
      act(() => {
        result.current.cycle();
      });
      seen.push(result.current.theme);
    }

    expect(seen).toEqual(['light', 'dark', 'system']);
  });

  it('anuncia cual es el siguiente tema', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.next).toBe('light');

    act(() => {
      result.current.cycle();
    });

    expect(result.current.next).toBe('dark');
  });

  it('una eleccion explicita marca el documento y volver a sistema lo limpia', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.cycle();
    });
    expect(attribute()).toBe('light');

    act(() => {
      result.current.cycle();
    });
    expect(attribute()).toBe('dark');

    act(() => {
      result.current.cycle();
    });
    expect(attribute()).toBeNull();
  });

  it('la eleccion guardada se recupera al montar', () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(attribute()).toBe('dark');
  });

  it('un valor corrupto cae en el tema del sistema', () => {
    window.localStorage.setItem(STORAGE_KEY, 'neon');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('system');
  });

  it('applyStoredTheme pinta el tema guardado antes de montar React', () => {
    window.localStorage.setItem(STORAGE_KEY, 'light');
    applyStoredTheme();
    expect(attribute()).toBe('light');
  });

  it('applyStoredTheme no marca nada cuando la eleccion es el sistema', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    window.localStorage.setItem(STORAGE_KEY, 'system');
    applyStoredTheme();
    expect(attribute()).toBeNull();
  });

  it('sobrevive a un almacenamiento bloqueado', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('system');

    act(() => {
      result.current.cycle();
    });

    expect(result.current.theme).toBe('light');
    expect(attribute()).toBe('light');
  });
});
