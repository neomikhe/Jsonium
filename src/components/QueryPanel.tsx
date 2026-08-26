import type { QueryResult } from '../core/jsonpath';
import { formatCount, formatDuration } from '../lib/format';
import { VList } from 'virtua';

const EXAMPLES = ['$.*', '$..id', '$[0:5]', '$..name'] as const;

interface QueryPanelProps {
  expression: string;
  result: QueryResult | null;
  error: string | null;
  isRunning: boolean;
  onExpressionChange: (expression: string) => void;
  onReveal: (path: string) => void;
}

export function QueryPanel(props: QueryPanelProps) {
  const { expression, result, error, isRunning, onExpressionChange, onReveal } = props;

  return (
    <>
      <input
        type="text"
        className="search__input"
        value={expression}
        placeholder="Consulta JSONPath, por ejemplo $..price"
        aria-label="Consulta JSONPath"
        spellCheck={false}
        onChange={(event) => {
          onExpressionChange(event.target.value);
        }}
      />

      <div className="examples">
        <span className="examples__label">ejemplos</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            className="examples__item"
            onClick={() => {
              onExpressionChange(example);
            }}
          >
            {example}
          </button>
        ))}
      </div>

      {error !== null && <p className="notice notice--error">{error}</p>}
      {isRunning && <p className="notice">Consultando...</p>}
      {result !== null && !isRunning && <QueryMatches result={result} onReveal={onReveal} />}
    </>
  );
}

interface QueryMatchesProps {
  result: QueryResult;
  onReveal: (path: string) => void;
}

function QueryMatches({ result, onReveal }: QueryMatchesProps) {
  if (result.matches.length === 0) {
    return <p className="notice">Sin coincidencias.</p>;
  }

  return (
    <>
      <p className="diff__summary">
        <span className="diff__stat">{formatCount(result.matches.length)} coincidencias</span>
        <span className="diff__time">
          {result.isTruncated ? 'limite alcanzado · ' : ''}
          {formatDuration(result.scanMs)}
        </span>
      </p>
      <VList className="tree" role="list" aria-label="Resultados de la consulta">
        {result.matches.map((match) => (
          <button
            key={match.path}
            type="button"
            className="hit"
            title="Mostrar en el editor"
            onClick={() => {
              onReveal(match.path);
            }}
          >
            <span className={`hit__where hit__where--${match.kind}`}>{match.kind}</span>
            <span className="hit__path">{match.path}</span>
            <span className="hit__preview">{match.preview}</span>
          </button>
        ))}
      </VList>
    </>
  );
}
