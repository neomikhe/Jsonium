import { describe, expect, it } from 'vitest';
import type { NodeId, NodeSummary } from '../core/types';
import { flattenRows } from './tree-rows';

function node(id: NodeId, childCount = 0): NodeSummary {
  return { id, key: `n${String(id)}`, index: null, kind: 'object', preview: '{}', childCount };
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
    const root = node(0, 2);
    const children = new Map([[0, [node(1), node(2)]]]);
    const rows = flattenRows(root, new Set([0]), children);

    expect(rows.map((row) => row.node.id)).toEqual([0, 1, 2]);
    expect(rows.map((row) => row.depth)).toEqual([0, 1, 1]);
  });

  it('anida varios niveles expandidos', () => {
    const children = new Map([
      [0, [node(1, 1), node(2)]],
      [1, [node(3)]],
    ]);
    const rows = flattenRows(node(0, 2), new Set([0, 1]), children);

    expect(rows.map((row) => row.node.id)).toEqual([0, 1, 3, 2]);
    expect(rows.map((row) => row.depth)).toEqual([0, 1, 2, 1]);
  });

  it('ignora un nodo expandido cuya pagina aun no ha llegado', () => {
    const rows = flattenRows(node(0, 5), new Set([0]), new Map());
    expect(rows.map((row) => row.node.id)).toEqual([0]);
  });
});
