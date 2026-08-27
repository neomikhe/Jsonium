import type { NodeSummary } from '../core/types';
import { formatCount } from '../lib/format';
import { useMessages } from '../lib/i18n';
import type { GapDirection, GapRow } from '../lib/tree-rows';

const INDENT_PX = 14;

interface TreeGapProps {
  row: GapRow;
  onTurnPage: (parent: NodeSummary, direction: GapDirection) => void;
}

export function TreeGap({ row, onTurnPage }: TreeGapProps) {
  const messages = useMessages();
  const label = messages.hiddenSiblings(formatCount(row.hidden));

  return (
    <div className="gap" style={{ paddingLeft: `${(row.depth * INDENT_PX).toString()}px` }}>
      <button
        type="button"
        className="gap__button"
        onClick={() => {
          onTurnPage(row.parent, row.direction);
        }}
      >
        {row.direction === 'before' ? '↑' : '↓'} {label}
      </button>
    </div>
  );
}
