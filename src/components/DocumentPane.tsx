import type { ConvertFormat, ConvertOutput } from '../core/convert';
import type { DiffResult } from '../core/diff';
import type { SearchResult } from '../core/search';
import type { NodeId, NodeSummary } from '../core/types';
import type { TreeRow } from '../lib/tree-rows';
import type { DocumentStatus } from '../lib/use-document';
import { ConvertPanel } from './ConvertPanel';
import { DiffPanel } from './DiffPanel';
import { DropZone } from './DropZone';
import { JsonTree } from './JsonTree';
import { SearchPanel } from './SearchPanel';

export type PaneMode = 'tree' | 'diff' | 'convert';

export interface SearchBinding {
  query: string;
  result: SearchResult | null;
  error: string | null;
  isSearching: boolean;
  setQuery: (query: string) => void;
}

export interface DiffBinding {
  compareName: string | null;
  arrayKey: string;
  result: DiffResult | null;
  error: string | null;
  isRunning: boolean;
  setArrayKey: (key: string) => void;
  loadCompare: (file: File) => void;
  clear: () => void;
}

export interface ConvertBinding {
  format: ConvertFormat;
  output: ConvertOutput | null;
  error: string | null;
  isRunning: boolean;
  setFormat: (format: ConvertFormat) => void;
}

export interface NodeActionBinding {
  onToggle: (node: NodeSummary) => void;
  onCopyPath: (node: NodeSummary) => void;
  onCopyValue: (node: NodeSummary) => void;
  onCopyText: (text: string, message: string) => void;
  onReveal: (node: NodeSummary) => void;
}

interface DocumentPaneProps {
  status: DocumentStatus;
  rows: readonly TreeRow[];
  expanded: ReadonlySet<NodeId>;
  search: SearchBinding;
  diff: DiffBinding;
  convert: ConvertBinding;
  actions: NodeActionBinding;
  mode: PaneMode;
  onModeChange: (mode: PaneMode) => void;
  onFile: (file: File) => void;
}

export function DocumentPane(props: DocumentPaneProps) {
  const { status, rows, expanded, search, diff, convert, actions, mode, onModeChange, onFile } =
    props;

  if (status.state === 'empty') return <DropZone onFile={onFile} />;
  if (status.state === 'loading') return <p className="notice">Parseando {status.name}...</p>;
  if (status.state === 'failed') {
    return (
      <p className="notice notice--error">
        No se pudo parsear {status.name}: {status.error}
      </p>
    );
  }

  return (
    <>
      <div className="modes" role="tablist" aria-label="Vista del documento">
        <ModeButton mode="tree" current={mode} label="Arbol" onSelect={onModeChange} />
        <ModeButton mode="diff" current={mode} label="Diff" onSelect={onModeChange} />
        <ModeButton mode="convert" current={mode} label="Convertir" onSelect={onModeChange} />
      </div>

      {mode === 'convert' && (
        <ConvertPanel
          format={convert.format}
          output={convert.output}
          error={convert.error}
          isRunning={convert.isRunning}
          onFormatChange={convert.setFormat}
          onCopy={(text) => {
            actions.onCopyText(text, 'Conversion copiada al portapapeles');
          }}
        />
      )}

      {mode === 'diff' && (
        <DiffPanel
          compareName={diff.compareName}
          arrayKey={diff.arrayKey}
          result={diff.result}
          error={diff.error}
          isRunning={diff.isRunning}
          onArrayKeyChange={diff.setArrayKey}
          onFile={diff.loadCompare}
          onClear={diff.clear}
        />
      )}

      {mode === 'tree' && (
        <TreeView rows={rows} expanded={expanded} search={search} actions={actions} />
      )}
    </>
  );
}

interface TreeViewProps {
  rows: readonly TreeRow[];
  expanded: ReadonlySet<NodeId>;
  search: SearchBinding;
  actions: NodeActionBinding;
}

function TreeView({ rows, expanded, search, actions }: TreeViewProps) {
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
      {search.query.trim() === '' ? (
        <JsonTree
          rows={rows}
          expanded={expanded}
          onToggle={actions.onToggle}
          onCopyPath={actions.onCopyPath}
          onCopyValue={actions.onCopyValue}
          onReveal={actions.onReveal}
        />
      ) : (
        <SearchPanel
          query={search.query}
          result={search.result}
          error={search.error}
          isSearching={search.isSearching}
          onCopyPath={(path) => {
            actions.onCopyText(path, 'Ruta copiada al portapapeles');
          }}
        />
      )}
    </>
  );
}

interface ModeButtonProps {
  mode: PaneMode;
  current: PaneMode;
  label: string;
  onSelect: (mode: PaneMode) => void;
}

function ModeButton({ mode, current, label, onSelect }: ModeButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={mode === current}
      className={mode === current ? 'modes__button modes__button--active' : 'modes__button'}
      onClick={() => {
        onSelect(mode);
      }}
    >
      {label}
    </button>
  );
}
