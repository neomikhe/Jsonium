import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CHILDREN_PAGE_SIZE } from '../core/limits';
import type { NodeId, NodeSummary } from '../core/types';
import type { TrailStep } from '../core/trail';
import type { DocumentClient } from './document-client';
import { flattenRows } from './tree-rows';
import type { TreeRow } from './tree-rows';

type Pages = ReadonlyMap<NodeId, NodeSummary[]>;

interface JsonTreeState {
  rows: TreeRow[];
  expanded: ReadonlySet<NodeId>;
  focused: NodeId | null;
  toggle: (node: NodeSummary) => void;
  revealPath: (path: string) => Promise<boolean>;
}

export function useJsonTree(client: DocumentClient, root: NodeSummary | null): JsonTreeState {
  const [expanded, setExpanded] = useState<ReadonlySet<NodeId>>(() => new Set<NodeId>());
  const [children, setChildren] = useState<Pages>(() => new Map());
  const [focused, setFocused] = useState<NodeId | null>(null);
  const childrenRef = useRef<Pages>(children);
  childrenRef.current = children;

  useEffect(() => {
    setExpanded(new Set<NodeId>());
    setChildren(new Map());
    setFocused(null);
  }, [root]);

  const loadChildren = useCallback(
    (node: NodeSummary) => {
      void client
        .children(node.id, 0, CHILDREN_PAGE_SIZE)
        .then((page) => {
          setChildren((current) => new Map(current).set(node.id, page));
        })
        .catch(() => {
          setExpanded((current) => toggleId(current, node.id));
        });
    },
    [client],
  );

  const toggle = useCallback(
    (node: NodeSummary) => {
      const willExpand = !expanded.has(node.id);
      setExpanded((current) => toggleId(current, node.id));
      setFocused(null);
      if (willExpand && node.childCount > 0 && !children.has(node.id)) loadChildren(node);
    },
    [expanded, children, loadChildren],
  );

  const revealPath = useCallback(
    async (path: string) => {
      const steps = await client.trail(path);
      if (steps === null) return false;
      const target = targetOf(steps, root);
      if (target === null) return false;
      setChildren((current) => absorb(current, steps));
      setExpanded((current) => new Set([...current, ...steps.map((step) => step.parentId)]));
      setFocused(target);
      return true;
    },
    [client, root],
  );

  const rows = useMemo(() => flattenRows(root, expanded, children), [root, expanded, children]);
  return { rows, expanded, focused, toggle, revealPath };
}

function targetOf(steps: readonly TrailStep[], root: NodeSummary | null): NodeId | null {
  return steps.at(-1)?.targetId ?? root?.id ?? null;
}

function absorb(current: Pages, steps: readonly TrailStep[]): Pages {
  const next = new Map(current);
  for (const step of steps) next.set(step.parentId, step.children);
  return next;
}

function toggleId(current: ReadonlySet<NodeId>, id: NodeId): ReadonlySet<NodeId> {
  const next = new Set(current);
  if (!next.delete(id)) next.add(id);
  return next;
}
