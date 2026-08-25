import type { RepairFix, RepairKind } from '../core/repair';

const LABELS: Record<RepairKind, string> = {
  trailingComma: 'comas finales',
  singleQuote: 'comillas simples',
  smartQuote: 'comillas tipograficas',
  unquotedKey: 'claves sin comillas',
  comment: 'comentarios',
  literal: 'literales no JSON',
};

interface RepairSummaryProps {
  fixes: readonly RepairFix[];
}

export function RepairSummary({ fixes }: RepairSummaryProps) {
  if (fixes.length === 0) return null;

  return (
    <div className="repair" role="status">
      <span className="repair__title">Correcciones aplicadas</span>
      <ul className="repair__list">
        {fixes.map((fix) => (
          <li key={fix.kind}>
            {LABELS[fix.kind]} <span className="repair__count">{fix.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
