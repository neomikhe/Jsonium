import { useCallback, useEffect, useMemo, useState } from 'react';
import { CHILDREN_PAGE_SIZE } from '../core/limits';
import type { NodeId, NodeSummary } from '../core/types';
import type { DocumentClient } from './document-client';
import { flattenRows } from './tree-rows';
import type { TreeRow } from './tree-rows';

interface JsonTreeState {
  rows: TreeRow[];
  expanded: ReadonlySet<NodeId>;
  toggle: (node: NodeSummary) => void;
}

export function useJsonTree(client: DocumentClient, root: NodeSummary | null): JsonTreeState {
  const [expanded, setExpanded] = useState<ReadonlySet<NodeId>>(() => new Set<NodeId>());
  const [children, setChildren] = useState<ReadonlyMap<NodeId, NodeSummary[]>>(() => new Map());

  useEffect(() => {
    setExpanded(new Set<NodeId>());
    setChildren(new Map());
  }, [root]);

  const loadChildren = useCallback(
    async (node: NodeSummary) => {
      const page = await client.children(node.id, 0, CHILDREN_PAGE_SIZE);
      setChildren((current) => new Map(current).set(node.id, page));
    },
    [client],
  );

  const toggle = useCallback(
    (node: NodeSummary) => {
      const willExpand = !expanded.has(node.id);
      setExpanded((current) => toggleId(current, node.id));
      if (willExpand && node.childCount > 0 && !children.has(node.id)) void loadChildren(node);
    },
    [expanded, children, loadChildren],
  );

  const rows = useMemo(() => flattenRows(root, expanded, children), [root, expanded, children]);
  return { rows, expanded, toggle };
}

function toggleId(current: ReadonlySet<NodeId>, id: NodeId): ReadonlySet<NodeId> {
  const next = new Set(current);
  if (!next.delete(id)) next.add(id);
  return next;
}
