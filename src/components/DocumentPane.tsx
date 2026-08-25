import type { SearchResult } from '../core/search';
import type { NodeId, NodeSummary } from '../core/types';
import type { TreeRow } from '../lib/tree-rows';
import type { DocumentStatus } from '../lib/use-document';
import { DropZone } from './DropZone';
import { JsonTree } from './JsonTree';
import { SearchPanel } from './SearchPanel';

interface DocumentPaneProps {
  status: DocumentStatus;
  rows: readonly TreeRow[];
  expanded: ReadonlySet<NodeId>;
  search: SearchBinding;
  actions: NodeActionBinding;
  onFile: (file: File) => void;
}

export interface SearchBinding {
  query: string;
  result: SearchResult | null;
  error: string | null;
  isSearching: boolean;
  setQuery: (query: string) => void;
}

export interface NodeActionBinding {
  onToggle: (node: NodeSummary) => void;
  onCopyPath: (node: NodeSummary) => void;
  onCopyValue: (node: NodeSummary) => void;
  onCopyText: (text: string, message: string) => void;
  onReveal: (node: NodeSummary) => void;
}

export function DocumentPane({
  status,
  rows,
  expanded,
  search,
  actions,
  onFile,
}: DocumentPaneProps) {
  if (status.state === 'empty') return <DropZone onFile={onFile} />;
  if (status.state === 'loading') return <p className="notice">Parseando {status.name}...</p>;
  if (status.state === 'failed') {
    return (
      <p className="notice notice--error">
        No se pudo parsear {status.name}: {status.error}
      </p>
    );
  }

  const isSearchActive = search.query.trim() !== '';

  return (
    <>
      <input
        type="search"
        className="search__input"
        value={search.query}
        placeholder="Buscar por clave o valor"
        aria-label="Buscar en el documento"
        onChange={(event) => {
          search.setQuery(event.target.value);
        }}
      />
      {isSearchActive ? (
        <SearchPanel
          query={search.query}
          result={search.result}
          error={search.error}
          isSearching={search.isSearching}
          onCopyPath={(path) => {
            actions.onCopyText(path, 'Ruta copiada al portapapeles');
          }}
        />
      ) : (
        <JsonTree
          rows={rows}
          expanded={expanded}
          onToggle={actions.onToggle}
          onCopyPath={actions.onCopyPath}
          onCopyValue={actions.onCopyValue}
          onReveal={actions.onReveal}
        />
      )}
    </>
  );
}
