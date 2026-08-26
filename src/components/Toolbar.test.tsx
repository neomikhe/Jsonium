/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StatsPanel } from './StatsPanel';
import { Toolbar } from './Toolbar';

function handlers() {
  return {
    onFormat: vi.fn(),
    onMinify: vi.fn(),
    onSortKeys: vi.fn(),
    onShare: vi.fn(),
  };
}

describe('Toolbar', () => {
  afterEach(() => {
    cleanup();
  });

  it('llama al manejador de cada accion', () => {
    const spies = handlers();
    render(<Toolbar isDisabled={false} {...spies} />);

    fireEvent.click(screen.getByText('Formatear'));
    fireEvent.click(screen.getByText('Minificar'));
    fireEvent.click(screen.getByText('Ordenar claves'));
    fireEvent.click(screen.getByText('Compartir enlace'));

    expect(spies.onFormat).toHaveBeenCalledOnce();
    expect(spies.onMinify).toHaveBeenCalledOnce();
    expect(spies.onSortKeys).toHaveBeenCalledOnce();
    expect(spies.onShare).toHaveBeenCalledOnce();
  });

  it('deshabilitado no dispara nada', () => {
    const spies = handlers();
    render(<Toolbar isDisabled {...spies} />);

    fireEvent.click(screen.getByText('Formatear'));

    expect(screen.getByText('Formatear').hasAttribute('disabled')).toBe(true);
    expect(spies.onFormat).not.toHaveBeenCalled();
  });

  it('anuncia los atajos en el titulo', () => {
    render(<Toolbar isDisabled={false} {...handlers()} />);
    expect(screen.getByText('Formatear').getAttribute('title')).toContain('Shift + F');
  });
});

describe('StatsPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('pinta los seis tipos con su recuento', () => {
    render(
      <StatsPanel
        stats={{
          nodes: 10,
          maxDepth: 3,
          scanMs: 1,
          kinds: { object: 2, array: 1, string: 4, number: 2, boolean: 1, null: 0 },
        }}
      />,
    );

    expect(screen.getByText('objetos')).toBeDefined();
    expect(screen.getByText('cadenas')).toBeDefined();
    expect(screen.getByText('4')).toBeDefined();
    expect(screen.getByText('0')).toBeDefined();
  });

  it('la barra mas larga corresponde al tipo mas frecuente', () => {
    const { container } = render(
      <StatsPanel
        stats={{
          nodes: 10,
          maxDepth: 1,
          scanMs: 1,
          kinds: { object: 1, array: 0, string: 10, number: 0, boolean: 0, null: 0 },
        }}
      />,
    );

    const fills = [...container.querySelectorAll('.stats__fill')].map((el) =>
      (el as HTMLElement).style.width,
    );
    expect(fills).toContain('100%');
    expect(fills).toContain('0%');
  });
});
