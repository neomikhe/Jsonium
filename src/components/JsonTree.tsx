import { useEffect, useRef } from 'react';
import { VList } from 'virtua';
import type { VListHandle } from 'virtua';
import type { NodeId, NodeSummary } from '../core/types';
import type { TreeRow as Row } from '../lib/tree-rows';
import { useMessages } from '../lib/i18n';
import { TreeRow } from './TreeRow';

interface JsonTreeProps {
  rows: readonly Row[];
  expanded: ReadonlySet<NodeId>;
  focused: NodeId | null;
  onToggle: (node: NodeSummary) => void;
  onCopyPath: (node: NodeSummary) => void;
  onCopyValue: (node: NodeSummary) => void;
  onReveal: (node: NodeSummary) => void;
}

export function JsonTree(props: JsonTreeProps) {
  const { rows, expanded, focused, onToggle, onCopyPath, onCopyValue, onReveal } = props;
  const messages = useMessages();
  const listRef = useRef<VListHandle>(null);

  useEffect(() => {
    if (focused === null) return;
    const at = rows.findIndex((row) => row.node.id === focused);
    if (at !== -1) listRef.current?.scrollToIndex(at, { align: 'center' });
  }, [focused, rows]);

  return (
    <VList ref={listRef} className="tree" role="tree" aria-label={messages.treeLabel}>
      {rows.map((row) => (
        <TreeRow
          key={row.node.id}
          row={row}
          isExpanded={expanded.has(row.node.id)}
          isFocused={row.node.id === focused}
          onToggle={onToggle}
          onCopyPath={onCopyPath}
          onCopyValue={onCopyValue}
          onReveal={onReveal}
        />
      ))}
    </VList>
  );
}
