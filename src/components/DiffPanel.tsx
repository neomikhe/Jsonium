import { VList } from 'virtua';
import type { DiffChange, DiffResult } from '../core/diff';
import { formatCount, formatDuration } from '../lib/format';
import { useMessages } from '../lib/i18n';
import { describeFailure } from '../lib/describe-failure';
import { DropZone } from './DropZone';

interface DiffPanelProps {
  compareName: string | null;
  arrayKey: string;
  result: DiffResult | null;
  error: string | null;
  isRunning: boolean;
  onArrayKeyChange: (key: string) => void;
  onFile: (file: File) => void;
  onClear: () => void;
  onReveal: (path: string) => void;
  onExport: (result: DiffResult) => void;
}

export function DiffPanel(props: DiffPanelProps) {
  const { compareName, arrayKey, result, error, isRunning } = props;
  const { onArrayKeyChange, onFile, onClear, onReveal, onExport } = props;
  const messages = useMessages();

  if (compareName === null) {
    return <DropZone onFile={onFile} label={messages.dropCompare} />;
  }

  return (
    <>
      <div className="diff__bar">
        <span className="diff__name" title={compareName}>
          {messages.versus(compareName)}
        </span>
        <label className="diff__key">
          {messages.matchArraysBy}
          <input
            type="text"
            value={arrayKey}
            placeholder={messages.byIndex}
            onChange={(event) => {
              onArrayKeyChange(event.target.value);
            }}
          />
        </label>
        {result !== null && result.changes.length > 0 && (
          <button
            type="button"
            className="diff__clear"
            onClick={() => {
              onExport(result);
            }}
          >
            {messages.exportDiff}
          </button>
        )}
        <button type="button" className="diff__clear" onClick={onClear}>
          {messages.remove}
        </button>
      </div>

      {error !== null && <p className="notice notice--error">{describeFailure(messages, error)}</p>}
      {isRunning && <p className="notice">{messages.comparing}</p>}
      {result !== null && !isRunning && <DiffChanges result={result} onReveal={onReveal} />}
    </>
  );
}

interface DiffChangesProps {
  result: DiffResult;
  onReveal: (path: string) => void;
}

function DiffChanges({ result, onReveal }: DiffChangesProps) {
  const messages = useMessages();
  if (result.changes.length === 0) {
    return <p className="notice">{messages.documentsEqual}</p>;
  }

  return (
    <>
      <p className="diff__summary">
        <span className="diff__stat diff__stat--added">+{formatCount(result.summary.added)}</span>
        <span className="diff__stat diff__stat--removed">
          -{formatCount(result.summary.removed)}
        </span>
        <span className="diff__stat diff__stat--changed">
          ~{formatCount(result.summary.changed)}
        </span>
        <span className="diff__time">
          {result.isTruncated ? `${messages.limitReached} · ` : ''}
          {formatDuration(result.scanMs)}
        </span>
      </p>
      <VList className="tree" role="list" aria-label={messages.changesLabel}>
        {result.changes.map((change) => (
          <button
            key={`${change.kind}:${change.path}`}
            type="button"
            className="hit"
            title={messages.showInEditor}
            onClick={() => {
              onReveal(change.path);
            }}
          >
            <span className={`hit__where hit__where--${change.kind}`}>
              {messages.changeKind[change.kind]}
            </span>
            <span className="hit__path">{change.path}</span>
            <span className="hit__preview">{describe(change)}</span>
          </button>
        ))}
      </VList>
    </>
  );
}

function describe(change: DiffChange): string {
  if (change.before === null) return change.after ?? '';
  if (change.after === null) return change.before;
  return `${change.before} → ${change.after}`;
}
