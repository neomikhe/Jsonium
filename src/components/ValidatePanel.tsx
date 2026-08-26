import { VList } from 'virtua';
import type { ValidationResult } from '../core/validate-schema';
import { formatCount, formatDuration } from '../lib/format';
import { useMessages } from '../lib/i18n';
import { describeFailure } from '../lib/describe-failure';
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
  const messages = useMessages();

  if (schemaName === null) {
    return <DropZone onFile={onFile} label={messages.dropSchema} />;
  }

  return (
    <>
      <div className="diff__bar">
        <span className="diff__name" title={schemaName}>
          {messages.against(schemaName)}
        </span>
        <button type="button" className="diff__clear" onClick={onClear}>
          {messages.remove}
        </button>
      </div>

      {error !== null && <p className="notice notice--error">{describeFailure(messages, error)}</p>}
      {isRunning && <p className="notice">{messages.validating}</p>}
      {result !== null && !isRunning && <Findings result={result} onReveal={onReveal} />}
    </>
  );
}

interface FindingsProps {
  result: ValidationResult;
  onReveal: (path: string) => void;
}

function Findings({ result, onReveal }: FindingsProps) {
  const messages = useMessages();
  if (result.isValid) {
    return <p className="notice notice--ok">{messages.documentValid}</p>;
  }

  return (
    <>
      <p className="diff__summary">
        <span className="diff__stat diff__stat--removed">
          {messages.violations(formatCount(result.errors.length))}
        </span>
        <span className="diff__time">
          {result.isTruncated ? `${messages.limitReached} · ` : ''}
          {formatDuration(result.scanMs)}
        </span>
      </p>
      <VList className="tree" role="list" aria-label={messages.violationsLabel}>
        {result.errors.map((finding, index) => (
          <button
            key={`${finding.keyword}:${finding.path}:${index.toString()}`}
            type="button"
            className="hit"
            title={messages.showInEditor}
            onClick={() => {
              onReveal(finding.path);
            }}
          >
            <span className="hit__where hit__where--removed">{finding.keyword}</span>
            <span className="hit__path">{finding.path}</span>
            <span className="hit__preview">
              {messages.rule[finding.keyword] ?? finding.keyword} {finding.detail}
            </span>
          </button>
        ))}
      </VList>
    </>
  );
}
