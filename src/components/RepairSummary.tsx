import type { RepairFix } from '../core/repair';
import { useMessages } from '../lib/i18n';

interface RepairSummaryProps {
  fixes: readonly RepairFix[];
}

export function RepairSummary({ fixes }: RepairSummaryProps) {
  const messages = useMessages();
  if (fixes.length === 0) return null;

  return (
    <div className="repair" role="status">
      <span className="repair__title">{messages.repairApplied}</span>
      <ul className="repair__list">
        {fixes.map((fix) => (
          <li key={fix.kind}>
            {messages.repairKind[fix.kind]} <span className="repair__count">{fix.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
