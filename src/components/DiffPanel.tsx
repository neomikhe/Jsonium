import { VList } from 'virtua';
import type { DiffChange, DiffResult } from '../core/diff';
import { formatCount, formatDuration } from '../lib/format';
import { DropZone } from './DropZone';

const KIND_LABELS: Record<DiffChange['kind'], string> = {
  added: 'alta',
  removed: 'baja',
  changed: 'cambio',
};

interface DiffPanelProps {
  compareName: string | null;
  arrayKey: string;
  result: DiffResult | null;
  error: string | null;
  isRunning: boolean;
  onArrayKeyChange: (key: string) => void;
  onFile: (file: File) => void;
  onClear: () => void;
}

export function DiffPanel(props: DiffPanelProps) {
  const { compareName, arrayKey, result, error, isRunning, onArrayKeyChange, onFile, onClear } =
    props;

  if (compareName === null) {
    return <DropZone onFile={onFile} label="Suelta el documento con el que comparar" />;
  }

  return (
    <>
      <div className="diff__bar">
        <span className="diff__name" title={compareName}>
          vs {compareName}
        </span>
        <label className="diff__key">
          emparejar arrays por
          <input
            type="text"
            value={arrayKey}
            placeholder="indice"
            onChange={(event) => {
              onArrayKeyChange(event.target.value);
            }}
          />
        </label>
        <button type="button" className="diff__clear" onClick={onClear}>
          Quitar
        </button>
      </div>

      {error !== null && <p className="notice notice--error">{error}</p>}
      {isRunning && <p className="notice">Comparando...</p>}
      {result !== null && !isRunning && <DiffChanges result={result} />}
    </>
  );
}

function DiffChanges({ result }: { result: DiffResult }) {
  if (result.changes.length === 0) {
    return <p className="notice">Los dos documentos son iguales.</p>;
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
          {result.isTruncated ? 'limite alcanzado · ' : ''}
          {formatDuration(result.scanMs)}
        </span>
      </p>
      <VList className="tree" role="list" aria-label="Cambios entre documentos">
        {result.changes.map((change) => (
          <div key={`${change.kind}:${change.path}`} className={`hit change--${change.kind}`}>
            <span className={`hit__where hit__where--${change.kind}`}>
              {KIND_LABELS[change.kind]}
            </span>
            <span className="hit__path">{change.path}</span>
            <span className="hit__preview">{describe(change)}</span>
          </div>
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
