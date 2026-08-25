import { VList } from 'virtua';
import type { SearchResult } from '../core/search';
import { formatCount, formatDuration } from '../lib/format';

interface SearchPanelProps {
  query: string;
  result: SearchResult | null;
  error: string | null;
  isSearching: boolean;
  onCopyPath: (path: string) => void;
}

export function SearchPanel({ query, result, error, isSearching, onCopyPath }: SearchPanelProps) {
  if (error !== null) return <p className="notice notice--error">{error}</p>;
  if (isSearching) return <p className="notice">Buscando {query}...</p>;
  if (result === null) return null;
  if (result.matches.length === 0) return <p className="notice">Sin coincidencias para {query}</p>;

  return (
    <>
      <p className="search__summary">
        {formatCount(result.matches.length)} coincidencias
        {result.isTruncated ? ' (limite alcanzado)' : ''} en {formatDuration(result.scanMs)}
      </p>
      <VList className="tree" role="list" aria-label="Resultados de la busqueda">
        {result.matches.map((match) => (
          <button
            key={`${match.path}:${match.where}`}
            type="button"
            className="hit"
            onClick={() => {
              onCopyPath(match.path);
            }}
            title="Copiar ruta"
          >
            <span className={`hit__where hit__where--${match.where}`}>{match.where}</span>
            <span className="hit__path">{match.path}</span>
            <span className="hit__preview">{match.preview}</span>
          </button>
        ))}
      </VList>
    </>
  );
}
