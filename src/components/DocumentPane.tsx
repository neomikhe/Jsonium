import type { ConvertOutput } from '../core/convert';
import type { OutputFormat } from '../lib/use-convert';
import type { DiffResult } from '../core/diff';
import type { QueryResult } from '../core/jsonpath';
import type { ValidationResult } from '../core/validate-schema';
import type { SearchResult } from '../core/search';
import type { NodeId, NodeSummary } from '../core/types';
import type { GapDirection, TreeRow } from '../lib/tree-rows';
import type { DocumentStatus } from '../lib/use-document';
import { useMessages } from '../lib/i18n';
import { PANE_MODES } from '../lib/pane-mode';
import type { PaneMode } from '../lib/pane-mode';
import { describeFailure } from '../lib/describe-failure';
import { ConvertPanel } from './ConvertPanel';
import { DiffPanel } from './DiffPanel';
import { DropZone } from './DropZone';
import { QueryPanel } from './QueryPanel';
import { JsonTree } from './JsonTree';
import { SearchPanel } from './SearchPanel';
import { ValidatePanel } from './ValidatePanel';

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
  format: OutputFormat;
  output: ConvertOutput | null;
  error: string | null;
  isRunning: boolean;
  setFormat: (format: OutputFormat) => void;
  mockCount: number;
  setMockCount: (count: number) => void;
}

export interface QueryBinding {
  expression: string;
  result: QueryResult | null;
  error: string | null;
  isRunning: boolean;
  setExpression: (expression: string) => void;
}

export interface ValidateBinding {
  schemaName: string | null;
  result: ValidationResult | null;
  error: string | null;
  isRunning: boolean;
  loadSchema: (file: File) => void;
  clear: () => void;
}

export interface TreeBinding {
  rows: readonly TreeRow[];
  expanded: ReadonlySet<NodeId>;
  focused: NodeId | null;
}

export interface NodeActionBinding {
  onToggle: (node: NodeSummary) => void;
  onCopyPath: (node: NodeSummary) => void;
  onCopyValue: (node: NodeSummary) => void;
  onCopyText: (text: string, message: string) => void;
  onReveal: (node: NodeSummary) => void;
  onRevealInTree: (path: string) => void;
  onTurnPage: (parent: NodeSummary, direction: GapDirection) => void;
}

interface DocumentPaneProps {
  status: DocumentStatus;
  tree: TreeBinding;
  search: SearchBinding;
  diff: DiffBinding;
  convert: ConvertBinding;
  query: QueryBinding;
  validate: ValidateBinding;
  actions: NodeActionBinding;
  mode: PaneMode;
  onModeChange: (mode: PaneMode) => void;
  onFile: (file: File) => void;
  onRevealPath: (path: string) => void;
  onExportDiff: (result: DiffResult) => void;
  onDownload: (text: string, format: OutputFormat) => void;
}

export function DocumentPane(props: DocumentPaneProps) {
  const { status, tree, search, diff, convert, query, validate, actions, mode } = props;
  const { onModeChange, onFile, onRevealPath, onExportDiff, onDownload } = props;
  const messages = useMessages();

  if (status.state === 'empty') return <DropZone onFile={onFile} />;
  if (status.state === 'loading') return <p className="notice">{messages.parsing(status.name)}</p>;
  if (status.state === 'failed') {
    return (
      <p className="notice notice--error">
        {messages.parseFailed(status.name, describeFailure(messages, status.error))}
      </p>
    );
  }

  return (
    <>
      <div className="modes" role="tablist" aria-label={messages.documentView}>
        {PANE_MODES.map((candidate) => (
          <ModeButton
            key={candidate}
            mode={candidate}
            current={mode}
            label={messages.mode[candidate]}
            onSelect={onModeChange}
          />
        ))}
      </div>

      {mode === 'validate' && (
        <ValidatePanel
          schemaName={validate.schemaName}
          result={validate.result}
          error={validate.error}
          isRunning={validate.isRunning}
          onFile={validate.loadSchema}
          onClear={validate.clear}
          onReveal={onRevealPath}
        />
      )}

      {mode === 'query' && (
        <QueryPanel
          expression={query.expression}
          result={query.result}
          error={query.error}
          isRunning={query.isRunning}
          onExpressionChange={query.setExpression}
          onReveal={onRevealPath}
        />
      )}

      {mode === 'convert' && (
        <ConvertPanel
          format={convert.format}
          output={convert.output}
          error={convert.error}
          isRunning={convert.isRunning}
          onFormatChange={convert.setFormat}
          onCopy={(text) => {
            actions.onCopyText(text, messages.conversionCopied);
          }}
          onDownload={onDownload}
          mockCount={convert.mockCount}
          onMockCountChange={convert.setMockCount}
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
          onReveal={onRevealPath}
          onExport={onExportDiff}
        />
      )}

      {mode === 'tree' && <TreeView tree={tree} search={search} actions={actions} />}
    </>
  );
}

interface TreeViewProps {
  tree: TreeBinding;
  search: SearchBinding;
  actions: NodeActionBinding;
}

function TreeView({ tree, search, actions }: TreeViewProps) {
  const messages = useMessages();

  return (
    <>
      <input
        type="search"
        className="search__input"
        value={search.query}
        placeholder={messages.searchPlaceholder}
        aria-label={messages.searchLabel}
        onChange={(event) => {
          search.setQuery(event.target.value);
        }}
      />
      {search.query.trim() === '' ? (
        <JsonTree
          rows={tree.rows}
          expanded={tree.expanded}
          focused={tree.focused}
          actions={actions}
        />
      ) : (
        <SearchPanel
          query={search.query}
          result={search.result}
          error={search.error}
          isSearching={search.isSearching}
          onCopyPath={(path) => {
            actions.onCopyText(path, messages.pathCopied);
          }}
          onRevealInTree={actions.onRevealInTree}
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
