import { VList } from 'virtua';
import type { ValidationResult } from '../core/validate-schema';
import { formatCount, formatDuration } from '../lib/format';
import { DropZone } from './DropZone';

interface ValidatePanelProps {
  schemaName: string | null;
  result: ValidationResult | null;
  error: string | null;
  isRunning: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
  onReveal: (path: string) => void;
}

export function ValidatePanel(props: ValidatePanelProps) {
  const { schemaName, result, error, isRunning, onFile, onClear, onReveal } = props;

  if (schemaName === null) {
    return <DropZone onFile={onFile} label="Suelta un JSON Schema para validar" />;
  }

  return (
    <>
      <div className="diff__bar">
        <span className="diff__name" title={schemaName}>
          contra {schemaName}
        </span>
        <button type="button" className="diff__clear" onClick={onClear}>
          Quitar
        </button>
      </div>

      {error !== null && <p className="notice notice--error">{error}</p>}
      {isRunning && <p className="notice">Validando...</p>}
      {result !== null && !isRunning && <Findings result={result} onReveal={onReveal} />}
    </>
  );
}

interface FindingsProps {
  result: ValidationResult;
  onReveal: (path: string) => void;
}

function Findings({ result, onReveal }: FindingsProps) {
  if (result.isValid) {
    return <p className="notice notice--ok">El documento cumple el esquema.</p>;
  }

  return (
    <>
      <p className="diff__summary">
        <span className="diff__stat diff__stat--removed">
          {formatCount(result.errors.length)} incumplimientos
        </span>
        <span className="diff__time">
          {result.isTruncated ? 'limite alcanzado · ' : ''}
          {formatDuration(result.scanMs)}
        </span>
      </p>
      <VList className="tree" role="list" aria-label="Incumplimientos del esquema">
        {result.errors.map((finding, index) => (
          <button
            key={`${finding.keyword}:${finding.path}:${index.toString()}`}
            type="button"
            className="hit"
            title="Mostrar en el editor"
            onClick={() => {
              onReveal(finding.path);
            }}
          >
            <span className="hit__where hit__where--removed">{finding.keyword}</span>
            <span className="hit__path">{finding.path}</span>
            <span className="hit__preview">{finding.message}</span>
          </button>
        ))}
      </VList>
    </>
  );
}
