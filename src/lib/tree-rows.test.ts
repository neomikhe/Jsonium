import { describe, expect, it } from 'vitest';
import type { NodeId, NodeSummary } from '../core/types';
import { flattenRows } from './tree-rows';
import type { LoadedPage, TreeRow } from './tree-rows';

function node(id: NodeId, childCount = 0): NodeSummary {
  return { id, key: `n${String(id)}`, index: null, kind: 'object', preview: '{}', childCount };
}

function page(offset: number, items: NodeSummary[]): LoadedPage {
  return { offset, items };
}

function shape(rows: readonly TreeRow[]): string[] {
  return rows.map((row) =>
    row.kind === 'node' ? `n${String(row.node.id)}` : `${row.direction}:${String(row.hidden)}`,
  );
}

describe('flattenRows', () => {
  it('devuelve vacio sin raiz', () => {
    expect(flattenRows(null, new Set(), new Map())).toEqual([]);
  });

  it('muestra solo la raiz si no esta expandida', () => {
    const rows = flattenRows(node(0, 2), new Set(), new Map());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.depth).toBe(0);
  });

  it('conserva el orden de los hijos al expandir', () => {
    const pages = new Map([[0, page(0, [node(1), node(2)])]]);
    const rows = flattenRows(node(0, 2), new Set([0]), pages);

    expect(shape(rows)).toEqual(['n0', 'n1', 'n2']);
    expect(rows.map((row) => row.depth)).toEqual([0, 1, 1]);
  });

  it('anida varios niveles expandidos', () => {
    const pages = new Map([
      [0, page(0, [node(1, 1), node(2)])],
      [1, page(0, [node(3)])],
    ]);
    const rows = flattenRows(node(0, 2), new Set([0, 1]), pages);

    expect(shape(rows)).toEqual(['n0', 'n1', 'n3', 'n2']);
    expect(rows.map((row) => row.depth)).toEqual([0, 1, 2, 1]);
  });

  it('ignora un nodo expandido cuya pagina aun no ha llegado', () => {
    const rows = flattenRows(node(0, 5), new Set([0]), new Map());
    expect(shape(rows)).toEqual(['n0']);
  });
});

describe('flattenRows: huecos de paginacion', () => {
  it('sin hijos ocultos no aparece ningun hueco', () => {
    const pages = new Map([[0, page(0, [node(1), node(2)])]]);
    expect(shape(flattenRows(node(0, 2), new Set([0]), pages))).toEqual(['n0', 'n1', 'n2']);
  });

  it('avisa de los que quedan por debajo de la pagina', () => {
    const pages = new Map([[0, page(0, [node(1), node(2)])]]);
    expect(shape(flattenRows(node(0, 40_000), new Set([0]), pages))).toEqual([
      'n0',
      'n1',
      'n2',
      'after:39998',
    ]);
  });

  it('avisa de los que quedan por encima de la pagina', () => {
    const pages = new Map([[0, page(39_800, [node(1), node(2)])]]);
    expect(shape(flattenRows(node(0, 39_802), new Set([0]), pages))).toEqual([
      'n0',
      'before:39800',
      'n1',
      'n2',
    ]);
  });

  it('una pagina del medio avisa por los dos lados', () => {
    const pages = new Map([[0, page(200, [node(1), node(2)])]]);
    expect(shape(flattenRows(node(0, 1000), new Set([0]), pages))).toEqual([
      'n0',
      'before:200',
      'n1',
      'n2',
      'after:798',
    ]);
  });

  it('el hueco hereda la profundidad de los hermanos que representa', () => {
    const pages = new Map([[0, page(200, [node(1)])]]);
    const rows = flattenRows(node(0, 1000), new Set([0]), pages);
    expect(rows.map((row) => row.depth)).toEqual([0, 1, 1, 1]);
  });

  it('el hueco nombra al padre al que pertenece', () => {
    const root = node(0, 1000);
    const pages = new Map([[0, page(0, [node(1)])]]);
    const gap = flattenRows(root, new Set([0]), pages).find((row) => row.kind === 'gap');
    expect(gap?.kind === 'gap' && gap.parent.id).toBe(0);
  });

  it('los huecos de niveles distintos no se mezclan', () => {
    const pages = new Map([
      [0, page(0, [node(1, 500)])],
      [1, page(0, [node(2)])],
    ]);
    const rows = flattenRows(node(0, 300), new Set([0, 1]), pages);
    expect(shape(rows)).toEqual(['n0', 'n1', 'n2', 'after:499', 'after:299']);
    expect(rows.map((row) => row.depth)).toEqual([0, 1, 2, 2, 1]);
  });
});
