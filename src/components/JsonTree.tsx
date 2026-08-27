import { useEffect, useRef } from 'react';
import { VList } from 'virtua';
import type { VListHandle } from 'virtua';
import type { NodeId, NodeSummary } from '../core/types';
import type { GapDirection, TreeRow as Row } from '../lib/tree-rows';
import { useMessages } from '../lib/i18n';
import { TreeGap } from './TreeGap';
import { TreeRow } from './TreeRow';

interface JsonTreeProps {
  rows: readonly Row[];
  expanded: ReadonlySet<NodeId>;
  focused: NodeId | null;
  actions: TreeActions;
}

export interface TreeActions {
  onToggle: (node: NodeSummary) => void;
  onCopyPath: (node: NodeSummary) => void;
  onCopyValue: (node: NodeSummary) => void;
  onReveal: (node: NodeSummary) => void;
  onTurnPage: (parent: NodeSummary, direction: GapDirection) => void;
}

export function JsonTree({ rows, expanded, focused, actions }: JsonTreeProps) {
  const messages = useMessages();
  const listRef = useRef<VListHandle>(null);

  useEffect(() => {
    if (focused === null) return;
    const at = rows.findIndex((row) => row.kind === 'node' && row.node.id === focused);
    if (at !== -1) listRef.current?.scrollToIndex(at, { align: 'center' });
  }, [focused, rows]);

  return (
    <VList ref={listRef} className="tree" role="tree" aria-label={messages.treeLabel}>
      {rows.map((row) =>
        row.kind === 'gap' ? (
          <TreeGap
            key={`gap:${row.parent.id.toString()}:${row.direction}`}
            row={row}
            onTurnPage={actions.onTurnPage}
          />
        ) : (
          <TreeRow
            key={row.node.id}
            row={row}
            isExpanded={expanded.has(row.node.id)}
            isFocused={row.node.id === focused}
            onToggle={actions.onToggle}
            onCopyPath={actions.onCopyPath}
            onCopyValue={actions.onCopyValue}
            onReveal={actions.onReveal}
          />
        ),
      )}
    </VList>
  );
}
