import { VList } from 'virtua';
import type { NodeId, NodeSummary } from '../core/types';
import type { TreeRow as Row } from '../lib/tree-rows';
import { TreeRow } from './TreeRow';

interface JsonTreeProps {
  rows: readonly Row[];
  expanded: ReadonlySet<NodeId>;
  onToggle: (node: NodeSummary) => void;
}

export function JsonTree({ rows, expanded, onToggle }: JsonTreeProps) {
  return (
    <VList className="tree" role="tree" aria-label="Arbol del documento">
      {rows.map((row) => (
        <TreeRow
          key={row.node.id}
          row={row}
          isExpanded={expanded.has(row.node.id)}
          onToggle={onToggle}
        />
      ))}
    </VList>
  );
}
