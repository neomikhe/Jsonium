import type { DocumentStats, JsonKind } from '../core/types';
import { formatCount } from '../lib/format';
import { useMessages } from '../lib/i18n';

const KINDS: readonly JsonKind[] = ['object', 'array', 'string', 'number', 'boolean', 'null'];
const FULL_PERCENT = 100;

interface StatsPanelProps {
  stats: DocumentStats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  const messages = useMessages();
  const peak = Math.max(...KINDS.map((kind) => stats.kinds[kind]));

  return (
    <div className="stats">
      <span className="stats__title">{messages.types}</span>
      <ul className="stats__list">
        {KINDS.map((kind) => (
          <li key={kind} className="stats__row">
            <span className="stats__label">{messages.kind[kind]}</span>
            <span className="stats__track">
              <span
                className={`stats__fill stats__fill--${kind}`}
                style={{ width: `${percentOf(stats.kinds[kind], peak).toString()}%` }}
              />
            </span>
            <span className="stats__count">{formatCount(stats.kinds[kind])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function percentOf(value: number, peak: number): number {
  if (peak === 0) return 0;
  return (value / peak) * FULL_PERCENT;
}
