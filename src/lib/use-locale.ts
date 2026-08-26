import { useCallback, useEffect, useState } from 'react';
import { CATALOGUE, detectLocale } from './i18n';
import type { Locale, Messages } from './i18n';

const STORAGE_KEY = 'jsonium.locale';

export interface LocaleBinding {
  locale: Locale;
  messages: Messages;
  toggle: () => void;
}

function isLocale(value: string | null): value is Locale {
  return value === 'es' || value === 'en';
}

function readStored(): Locale | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

function remember(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // El almacenamiento puede estar bloqueado: el idioma vive solo en esta sesion
  }
}

export function useLocale(): LocaleBinding {
  const [locale, setLocale] = useState<Locale>(() => readStored() ?? detectLocale());

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const toggle = useCallback(() => {
    setLocale((current) => {
      const next: Locale = current === 'es' ? 'en' : 'es';
      remember(next);
      return next;
    });
  }, []);

  return { locale, messages: CATALOGUE[locale], toggle };
}
