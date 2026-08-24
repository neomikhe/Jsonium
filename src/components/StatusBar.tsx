import type { DocumentStats, ParseResult } from '../core/types';
import { formatBytes, formatCount, formatDuration } from '../lib/format';

interface StatusBarProps {
  name: string;
  result: ParseResult;
  stats: DocumentStats | null;
  onRequestStats: () => void;
}

export function StatusBar({ name, result, stats, onRequestStats }: StatusBarProps) {
  return (
    <div className="status">
      <span className="status__name" title={name}>
        {name}
      </span>
      <Metric label="tamano" value={formatBytes(result.bytes)} />
      <Metric label="parse" value={formatDuration(result.parseMs)} />
      {stats === null ? (
        <button type="button" className="status__action" onClick={onRequestStats}>
          Calcular estadisticas
        </button>
      ) : (
        <>
          <Metric label="nodos" value={formatCount(stats.nodes)} />
          <Metric label="profundidad" value={formatCount(stats.maxDepth)} />
          <Metric label="scan" value={formatDuration(stats.scanMs)} />
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="metric">
      <span className="metric__label">{label}</span>
      <span className="metric__value">{value}</span>
    </span>
  );
}
