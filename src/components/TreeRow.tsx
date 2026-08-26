import type { NodeSummary } from '../core/types';
import { useMessages } from '../lib/i18n';
import type { TreeRow as Row } from '../lib/tree-rows';

const INDENT_PX = 14;

interface TreeRowProps {
  row: Row;
  isExpanded: boolean;
  onToggle: (node: NodeSummary) => void;
  onCopyPath: (node: NodeSummary) => void;
  onCopyValue: (node: NodeSummary) => void;
  onReveal: (node: NodeSummary) => void;
}

export function TreeRow(props: TreeRowProps) {
  const { row, isExpanded, onToggle, onCopyPath, onCopyValue, onReveal } = props;
  const messages = useMessages();
  const { node, depth } = row;
  const isBranch = node.childCount > 0;

  return (
    <div
      className="row"
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={false}
      aria-expanded={isBranch ? isExpanded : undefined}
      style={{ paddingLeft: `${(depth * INDENT_PX).toString()}px` }}
    >
      <button
        type="button"
        className="row__toggle"
        disabled={!isBranch}
        aria-label={isExpanded ? messages.collapse : messages.expand}
        onClick={() => {
          onToggle(node);
        }}
      >
        {branchMarker(isBranch, isExpanded)}
      </button>
      <button
        type="button"
        className="row__label"
        title={messages.showInEditor}
        onClick={() => {
          onReveal(node);
        }}
      >
        {labelOf(node)}
      </button>
      <span className={`row__preview row__preview--${node.kind}`}>{node.preview}</span>
      <span className="row__actions">
        <button
          type="button"
          onClick={() => {
            onCopyPath(node);
          }}
        >
          {messages.path}
        </button>
        <button
          type="button"
          onClick={() => {
            onCopyValue(node);
          }}
        >
          {messages.value}
        </button>
      </span>
    </div>
  );
}

function branchMarker(isBranch: boolean, isExpanded: boolean): string {
  if (!isBranch) return '·';
  return isExpanded ? '▾' : '▸';
}

function labelOf(node: NodeSummary): string {
  if (node.key !== null) return node.key;
  if (node.index !== null) return `[${node.index.toString()}]`;
  return 'root';
}
