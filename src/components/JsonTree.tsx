import { VList } from 'virtua';
import type { NodeId, NodeSummary } from '../core/types';
import type { TreeRow as Row } from '../lib/tree-rows';
import { TreeRow } from './TreeRow';

interface JsonTreeProps {
  rows: readonly Row[];
  expanded: ReadonlySet<NodeId>;
  onToggle: (node: NodeSummary) => void;
  onCopyPath: (node: NodeSummary) => void;
  onCopyValue: (node: NodeSummary) => void;
  onReveal: (node: NodeSummary) => void;
}

export function JsonTree(props: JsonTreeProps) {
  const { rows, expanded, onToggle, onCopyPath, onCopyValue, onReveal } = props;
  return (
    <VList className="tree" role="tree" aria-label="Arbol del documento">
      {rows.map((row) => (
        <TreeRow
          key={row.node.id}
          row={row}
          isExpanded={expanded.has(row.node.id)}
          onToggle={onToggle}
          onCopyPath={onCopyPath}
          onCopyValue={onCopyValue}
          onReveal={onReveal}
        />
      ))}
    </VList>
  );
}
