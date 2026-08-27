import { useCallback, useEffect, useState } from 'react';

export const THEMES = ['system', 'light', 'dark'] as const;

export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = 'jsonium.theme';
const THEME_ATTRIBUTE = 'data-theme';

export interface ThemeBinding {
  theme: Theme;
  next: Theme;
  cycle: () => void;
}

function isTheme(value: string | null): value is Theme {
  return value === 'system' || value === 'light' || value === 'dark';
}

function readStored(): Theme {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute(THEME_ATTRIBUTE);
  else root.setAttribute(THEME_ATTRIBUTE, theme);
}

export function applyStoredTheme(): void {
  applyTheme(readStored());
}

function remember(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // El almacenamiento puede estar bloqueado: el tema vive solo en esta sesion
  }
}

function nextTheme(current: Theme): Theme {
  const at = THEMES.indexOf(current);
  return THEMES[(at + 1) % THEMES.length] ?? 'system';
}

export function useTheme(): ThemeBinding {
  const [theme, setTheme] = useState<Theme>(readStored);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme((current) => {
      const next = nextTheme(current);
      remember(next);
      return next;
    });
  }, []);

  return { theme, next: nextTheme(theme), cycle };
}
