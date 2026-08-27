import type { NodeId, NodeSummary } from '../core/types';

export interface LoadedPage {
  offset: number;
  items: readonly NodeSummary[];
}

export type GapDirection = 'before' | 'after';

export interface NodeRow {
  kind: 'node';
  node: NodeSummary;
  depth: number;
}

export interface GapRow {
  kind: 'gap';
  parent: NodeSummary;
  depth: number;
  direction: GapDirection;
  hidden: number;
}

export type TreeRow = NodeRow | GapRow;

export function flattenRows(
  root: NodeSummary | null,
  expanded: ReadonlySet<NodeId>,
  pages: ReadonlyMap<NodeId, LoadedPage>,
): TreeRow[] {
  if (root === null) return [];
  const rows: TreeRow[] = [];
  const stack: TreeRow[] = [{ kind: 'node', node: root, depth: 0 }];

  while (stack.length > 0) {
    const row = stack.pop();
    if (row === undefined) break;
    rows.push(row);
    if (row.kind !== 'node' || !expanded.has(row.node.id)) continue;
    const page = pages.get(row.node.id);
    if (page !== undefined) pushChildren(stack, row, page);
  }

  return rows;
}

function pushChildren(stack: TreeRow[], parent: NodeRow, page: LoadedPage): void {
  const depth = parent.depth + 1;
  const after = parent.node.childCount - (page.offset + page.items.length);
  if (after > 0) stack.push(gapRow(parent, 'after', after));
  for (const child of page.items.toReversed()) stack.push({ kind: 'node', node: child, depth });
  if (page.offset > 0) stack.push(gapRow(parent, 'before', page.offset));
}

function gapRow(parent: NodeRow, direction: GapDirection, hidden: number): GapRow {
  return { kind: 'gap', parent: parent.node, depth: parent.depth + 1, direction, hidden };
}
