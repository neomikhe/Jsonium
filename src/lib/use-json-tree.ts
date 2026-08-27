import { useCallback, useEffect, useMemo, useState } from 'react';
import { CHILDREN_PAGE_SIZE } from '../core/limits';
import type { NodeId, NodeSummary } from '../core/types';
import type { TrailStep } from '../core/trail';
import type { DocumentClient } from './document-client';
import { flattenRows } from './tree-rows';
import type { GapDirection, LoadedPage, TreeRow } from './tree-rows';

type Pages = ReadonlyMap<NodeId, LoadedPage>;

interface JsonTreeState {
  rows: TreeRow[];
  expanded: ReadonlySet<NodeId>;
  focused: NodeId | null;
  toggle: (node: NodeSummary) => void;
  revealPath: (path: string) => Promise<boolean>;
  turnPage: (parent: NodeSummary, direction: GapDirection) => void;
}

export function useJsonTree(client: DocumentClient, root: NodeSummary | null): JsonTreeState {
  const [expanded, setExpanded] = useState<ReadonlySet<NodeId>>(() => new Set<NodeId>());
  const [pages, setPages] = useState<Pages>(() => new Map());
  const [focused, setFocused] = useState<NodeId | null>(null);

  useEffect(() => {
    setExpanded(new Set<NodeId>());
    setPages(new Map());
    setFocused(null);
  }, [root]);

  const loadPage = useCallback(
    (node: NodeSummary, offset: number) => {
      void client
        .children(node.id, offset, CHILDREN_PAGE_SIZE)
        .then((items) => {
          setPages((current) => new Map(current).set(node.id, { offset, items }));
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
      if (willExpand && node.childCount > 0 && !pages.has(node.id)) loadPage(node, 0);
    },
    [expanded, pages, loadPage],
  );

  const turnPage = useCallback(
    (parent: NodeSummary, direction: GapDirection) => {
      const current = pages.get(parent.id);
      if (current === undefined) return;
      setFocused(null);
      loadPage(parent, nextOffset(current, direction));
    },
    [pages, loadPage],
  );

  const revealPath = useCallback(
    async (path: string) => {
      const steps = await client.trail(path);
      if (steps === null) return false;
      const target = targetOf(steps, root);
      if (target === null) return false;
      setPages((current) => absorb(current, steps));
      setExpanded((current) => new Set([...current, ...steps.map((step) => step.parentId)]));
      setFocused(target);
      return true;
    },
    [client, root],
  );

  const rows = useMemo(() => flattenRows(root, expanded, pages), [root, expanded, pages]);
  return { rows, expanded, focused, toggle, revealPath, turnPage };
}

function nextOffset(page: LoadedPage, direction: GapDirection): number {
  if (direction === 'before') return Math.max(0, page.offset - CHILDREN_PAGE_SIZE);
  return page.offset + page.items.length;
}

function targetOf(steps: readonly TrailStep[], root: NodeSummary | null): NodeId | null {
  return steps.at(-1)?.targetId ?? root?.id ?? null;
}

function absorb(current: Pages, steps: readonly TrailStep[]): Pages {
  const next = new Map(current);
  for (const step of steps) next.set(step.parentId, { offset: step.offset, items: step.children });
  return next;
}

function toggleId(current: ReadonlySet<NodeId>, id: NodeId): ReadonlySet<NodeId> {
  const next = new Set(current);
  if (!next.delete(id)) next.add(id);
  return next;
}
