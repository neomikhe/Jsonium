import { useCallback, useEffect, useState } from 'react';
import { DocumentPane } from './components/DocumentPane';
import { DropZone } from './components/DropZone';
import { EditorPane } from './components/EditorPane';
import { StatsPanel } from './components/StatsPanel';
import { StatusBar } from './components/StatusBar';
import { Tabs } from './components/Tabs';
import { Toolbar } from './components/Toolbar';
import { EDITOR_MAX_BYTES, INDENT_SPACES } from './core/limits';
import { locatePath } from './core/locate';
import type { Span } from './core/locate';
import type { DocumentStats, NodeSummary } from './core/types';
import { formatBytes } from './lib/format';
import { useDocument } from './lib/use-document';
import { useEditorText } from './lib/use-editor-text';
import { useJsonTree } from './lib/use-json-tree';
import { useNodeActions } from './lib/use-node-actions';
import { useSearch } from './lib/use-search';
import { useTabs } from './lib/use-tabs';

export function App() {
  const { client, status, openFile, applyText } = useDocument();
  const root = status.state === 'ready' ? status.result.root : null;
  const { rows, expanded, toggle } = useJsonTree(client, root);
  const editor = useEditorText(client, status, applyText);
  const search = useSearch(client, status.state === 'ready');
  const { hint, copyPath, copyValue, copyText } = useNodeActions(client);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const tabs = useTabs(status, editor.text);
  const [reveal, setReveal] = useState<Span | null>(null);

  useEffect(() => {
    setStats(null);
  }, [root]);

  const requestStats = useCallback(() => {
    void client
      .stats()
      .then(setStats)
      .catch(() => {
        setStats(null);
      });
  }, [client]);

  const handleFile = useCallback(
    (file: File) => {
      void openFile(file);
    },
    [openFile],
  );

  const { applyOptions, loadText } = editor;

  const revealNode = useCallback(
    (node: NodeSummary) => {
      if (!editor.isEditable) return;
      void client
        .path(node.id)
        .then((path) => {
          setReveal(locatePath(editor.text, path));
        })
        .catch(() => {
          setReveal(null);
        });
    },
    [client, editor.isEditable, editor.text],
  );

  const openTab = useCallback(
    (id: string) => {
      void tabs
        .open(id)
        .then(async (stored) => {
          if (stored === null) return;
          loadText(stored.text);
          await applyText(stored.text, stored.name);
        })
        .catch(() => {
          tabs.close(id);
        });
    },
    [tabs, loadText, applyText],
  );
  const mainClass = editor.isEditable ? 'app__main' : 'app__main app__main--single';

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Jsonium</h1>
        <p className="app__tagline">Banco de trabajo JSON local. Cero red.</p>
        <DropZone onFile={handleFile} isCompact />
      </header>

      <Tabs
        entries={tabs.entries}
        activeId={tabs.activeId}
        onOpen={openTab}
        onClose={tabs.close}
        onClearAll={tabs.clearAll}
      />

      <Toolbar
        isDisabled={status.state !== 'ready' || !editor.isEditable}
        onFormat={() => {
          applyOptions({ indent: INDENT_SPACES, sortKeys: false });
        }}
        onMinify={() => {
          applyOptions({ indent: 0, sortKeys: false });
        }}
        onSortKeys={() => {
          applyOptions({ indent: INDENT_SPACES, sortKeys: true });
        }}
      />

      {status.state === 'ready' && (
        <StatusBar
          name={status.name}
          result={status.result}
          stats={stats}
          onRequestStats={requestStats}
        />
      )}

      {stats !== null && <StatsPanel stats={stats} />}

      {!editor.isEditable && (
        <p className="notice notice--slim">
          El editor y el guardado automatico se desactivan por encima de{' '}
          {formatBytes(EDITOR_MAX_BYTES)}: mantener tanto texto en el hilo principal congelaria la
          interfaz. Navega el documento con el arbol.
        </p>
      )}

      <main className={mainClass}>
        {editor.isEditable && (
          <EditorPane
            text={editor.text}
            error={editor.error}
            fixes={editor.fixes}
            canRepair={editor.canRepair}
          reveal={reveal}
            onChange={editor.handleChange}
            onRepair={editor.applyRepair}
          />
        )}
        <section className="pane">
          <DocumentPane
            status={status}
            rows={rows}
            expanded={expanded}
            search={search}
            actions={{
              onToggle: toggle,
              onCopyPath: copyPath,
              onCopyValue: copyValue,
              onCopyText: copyText,
              onReveal: revealNode,
            }}
            onFile={handleFile}
          />
        </section>
      </main>

      <output className="hint" aria-live="polite">
        {hint ?? ''}
      </output>
    </div>
  );
}
