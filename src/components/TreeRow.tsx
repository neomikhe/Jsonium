import type { NodeSummary } from '../core/types';
import type { TreeRow as Row } from '../lib/tree-rows';

const INDENT_PX = 14;

interface TreeRowProps {
  row: Row;
  isExpanded: boolean;
  onToggle: (node: NodeSummary) => void;
}

export function TreeRow({ row, isExpanded, onToggle }: TreeRowProps) {
  const { node, depth } = row;
  const isBranch = node.childCount > 0;

  return (
    <div
      className="row"
      role="treeitem"
      aria-level={depth + 1}
      aria-expanded={isBranch ? isExpanded : undefined}
      style={{ paddingLeft: `${(depth * INDENT_PX).toString()}px` }}
    >
      <button
        type="button"
        className="row__toggle"
        disabled={!isBranch}
        aria-label={isExpanded ? 'Contraer' : 'Expandir'}
        onClick={() => {
          onToggle(node);
        }}
      >
        {branchMarker(isBranch, isExpanded)}
      </button>
      <span className="row__label">{labelOf(node)}</span>
      <span className={`row__preview row__preview--${node.kind}`}>{node.preview}</span>
    </div>
  );
}

function branchMarker(isBranch: boolean, isExpanded: boolean): string {
  if (!isBranch) return '\u00b7';
  return isExpanded ? '\u25be' : '\u25b8';
}

function labelOf(node: NodeSummary): string {
  if (node.key !== null) return node.key;
  if (node.index !== null) return `[${node.index.toString()}]`;
  return 'root';
}
