import type { DocumentStats, ParseResult } from '../core/types';
import { formatBytes, formatCount, formatDuration } from '../lib/format';
import { useMessages } from '../lib/i18n';

interface StatusBarProps {
  name: string;
  result: ParseResult;
  stats: DocumentStats | null;
  onRequestStats: () => void;
}

export function StatusBar({ name, result, stats, onRequestStats }: StatusBarProps) {
  const messages = useMessages();

  return (
    <div className="status">
      <span className="status__name" title={name}>
        {name}
      </span>
      <Metric label={messages.size} value={formatBytes(result.bytes)} />
      <Metric label={messages.parse} value={formatDuration(result.parseMs)} />
      {stats === null ? (
        <button type="button" className="status__action" onClick={onRequestStats}>
          {messages.computeStats}
        </button>
      ) : (
        <>
          <Metric label={messages.nodes} value={formatCount(stats.nodes)} />
          <Metric label={messages.depth} value={formatCount(stats.maxDepth)} />
          <Metric label={messages.scan} value={formatDuration(stats.scanMs)} />
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
