import { VList } from 'virtua';
import type { SearchResult } from '../core/search';
import { formatCount, formatDuration } from '../lib/format';
import { useMessages } from '../lib/i18n';
import { describeFailure } from '../lib/describe-failure';

interface SearchPanelProps {
  query: string;
  result: SearchResult | null;
  error: string | null;
  isSearching: boolean;
  onCopyPath: (path: string) => void;
  onRevealInTree: (path: string) => void;
}

export function SearchPanel(props: SearchPanelProps) {
  const { query, result, error, isSearching, onCopyPath, onRevealInTree } = props;
  const messages = useMessages();

  if (error !== null) {
    return <p className="notice notice--error">{describeFailure(messages, error)}</p>;
  }
  if (isSearching) return <p className="notice">{messages.searching(query)}</p>;
  if (result === null) return null;
  if (result.matches.length === 0) return <p className="notice">{messages.noMatchesFor(query)}</p>;

  return (
    <>
      <p className="search__summary">
        {messages.matches(formatCount(result.matches.length))}{' '}
        {result.isTruncated ? `(${messages.limitReached}) ` : ''}
        {messages.inTime(formatDuration(result.scanMs))}
      </p>
      <VList className="tree" role="list" aria-label={messages.searchResults}>
        {result.matches.map((match) => (
          <div key={`${match.path}:${match.where}`} className="hit">
            <button
              type="button"
              className="hit__open"
              title={messages.showInTree}
              onClick={() => {
                onRevealInTree(match.path);
              }}
            >
              <span className={`hit__where hit__where--${match.where}`}>{match.where}</span>
              <span className="hit__path">{match.path}</span>
              <span className="hit__preview">{match.preview}</span>
            </button>
            <button
              type="button"
              className="hit__copy"
              title={messages.copyPathTitle}
              onClick={() => {
                onCopyPath(match.path);
              }}
            >
              {messages.path}
            </button>
          </div>
        ))}
      </VList>
    </>
  );
}
