import type { QueryResult } from '../core/jsonpath';
import { formatCount, formatDuration } from '../lib/format';
import { useMessages } from '../lib/i18n';
import { describeFailure } from '../lib/describe-failure';
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
  const messages = useMessages();

  return (
    <>
      <input
        type="text"
        className="search__input"
        value={expression}
        placeholder={messages.queryPlaceholder}
        aria-label={messages.queryLabel}
        spellCheck={false}
        onChange={(event) => {
          onExpressionChange(event.target.value);
        }}
      />

      <div className="examples">
        <span className="examples__label">{messages.examples}</span>
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

      {error !== null && <p className="notice notice--error">{describeFailure(messages, error)}</p>}
      {isRunning && <p className="notice">{messages.querying}</p>}
      {result !== null && !isRunning && <QueryMatches result={result} onReveal={onReveal} />}
    </>
  );
}

interface QueryMatchesProps {
  result: QueryResult;
  onReveal: (path: string) => void;
}

function QueryMatches({ result, onReveal }: QueryMatchesProps) {
  const messages = useMessages();
  if (result.matches.length === 0) {
    return <p className="notice">{messages.noMatches}</p>;
  }

  return (
    <>
      <p className="diff__summary">
        <span className="diff__stat">{messages.matches(formatCount(result.matches.length))}</span>
        <span className="diff__time">
          {result.isTruncated ? `${messages.limitReached} · ` : ''}
          {formatDuration(result.scanMs)}
        </span>
      </p>
      <VList className="tree" role="list" aria-label={messages.queryResults}>
        {result.matches.map((match) => (
          <button
            key={match.path}
            type="button"
            className="hit"
            title={messages.showInEditor}
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
