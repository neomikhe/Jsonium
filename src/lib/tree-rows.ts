import type { NodeId, NodeSummary } from '../core/types';

export interface TreeRow {
  node: NodeSummary;
  depth: number;
}

export function flattenRows(
  root: NodeSummary | null,
  expanded: ReadonlySet<NodeId>,
  children: ReadonlyMap<NodeId, readonly NodeSummary[]>,
): TreeRow[] {
  if (root === null) return [];
  const rows: TreeRow[] = [];
  const stack: TreeRow[] = [{ node: root, depth: 0 }];

  while (stack.length > 0) {
    const row = stack.pop();
    if (row === undefined) break;
    rows.push(row);
    if (!expanded.has(row.node.id)) continue;
    const depth = row.depth + 1;
    const page = children.get(row.node.id) ?? [];
    for (const child of page.toReversed()) stack.push({ node: child, depth });
  }

  return rows;
}
