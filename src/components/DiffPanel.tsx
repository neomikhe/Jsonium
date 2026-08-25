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
  onReveal: (path: string) => void;
  onExport: (result: DiffResult) => void;
}

export function DiffPanel(props: DiffPanelProps) {
  const { compareName, arrayKey, result, error, isRunning } = props;
  const { onArrayKeyChange, onFile, onClear, onReveal, onExport } = props;

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
        {result !== null && result.changes.length > 0 && (
          <button
            type="button"
            className="diff__clear"
            onClick={() => {
              onExport(result);
            }}
          >
            Exportar
          </button>
        )}
        <button type="button" className="diff__clear" onClick={onClear}>
          Quitar
        </button>
      </div>

      {error !== null && <p className="notice notice--error">{error}</p>}
      {isRunning && <p className="notice">Comparando...</p>}
      {result !== null && !isRunning && <DiffChanges result={result} onReveal={onReveal} />}
    </>
  );
}

interface DiffChangesProps {
  result: DiffResult;
  onReveal: (path: string) => void;
}

function DiffChanges({ result, onReveal }: DiffChangesProps) {
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
          <button
            key={`${change.kind}:${change.path}`}
            type="button"
            className="hit"
            title="Mostrar en el editor"
            onClick={() => {
              onReveal(change.path);
            }}
          >
            <span className={`hit__where hit__where--${change.kind}`}>
              {KIND_LABELS[change.kind]}
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
