/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { CATALOGUE, MessagesContext } from '../lib/i18n';
import type { Locale } from '../lib/i18n';
import { Preferences } from './Preferences';

function inLocale(locale: Locale, node: ReactNode) {
  return <MessagesContext.Provider value={CATALOGUE[locale]}>{node}</MessagesContext.Provider>;
}

function shapeOf(icon: Element | null): string {
  return [...(icon?.children ?? [])]
    .map((part) => `${part.tagName}:${part.getAttribute('d') ?? part.getAttribute('r') ?? ''}`)
    .join('|');
}

describe('Preferences', () => {
  afterEach(() => {
    cleanup();
  });

  it('el titulo del tema anuncia el siguiente, no el actual', () => {
    render(
      inLocale(
        'es',
        <Preferences
          theme="system"
          nextTheme="light"
          onCycleTheme={vi.fn()}
          onSwitchLanguage={vi.fn()}
        />,
      ),
    );

    expect(screen.getByTitle('Cambiar al tema claro')).toBeDefined();
  });

  it('cada tema dibuja un icono distinto', () => {
    const marks = (['system', 'light', 'dark'] as const).map((theme) => {
      cleanup();
      const { container } = render(
        inLocale(
          'en',
          <Preferences
            theme={theme}
            nextTheme="light"
            onCycleTheme={vi.fn()}
            onSwitchLanguage={vi.fn()}
          />,
        ),
      );
      return shapeOf(container.querySelector('.prefs__icon'));
    });

    expect(new Set(marks).size).toBe(3);
  });

  it('cada boton llama a su manejador', () => {
    const onCycleTheme = vi.fn();
    const onSwitchLanguage = vi.fn();
    render(
      inLocale(
        'en',
        <Preferences
          theme="dark"
          nextTheme="system"
          onCycleTheme={onCycleTheme}
          onSwitchLanguage={onSwitchLanguage}
        />,
      ),
    );

    fireEvent.click(screen.getByTitle('Switch to the system theme'));
    fireEvent.click(screen.getByText('EN'));

    expect(onCycleTheme).toHaveBeenCalledOnce();
    expect(onSwitchLanguage).toHaveBeenCalledOnce();
  });
});
