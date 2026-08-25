import { useCallback, useEffect, useState } from 'react';
import { DocumentPane } from './components/DocumentPane';
import { DropZone } from './components/DropZone';
import { EditorPane } from './components/EditorPane';
import { StatusBar } from './components/StatusBar';
import { Toolbar } from './components/Toolbar';
import { EDITOR_MAX_BYTES, INDENT_SPACES } from './core/limits';
import type { DocumentStats } from './core/types';
import { formatBytes } from './lib/format';
import { useDocument } from './lib/use-document';
import { useEditorText } from './lib/use-editor-text';
import { useJsonTree } from './lib/use-json-tree';
import { useNodeActions } from './lib/use-node-actions';
import { useSearch } from './lib/use-search';

export function App() {
  const { client, status, openFile, applyText } = useDocument();
  const root = status.state === 'ready' ? status.result.root : null;
  const { rows, expanded, toggle } = useJsonTree(client, root);
  const editor = useEditorText(client, status, applyText);
  const search = useSearch(client, status.state === 'ready');
  const { hint, copyPath, copyValue, copyText } = useNodeActions(client);
  const [stats, setStats] = useState<DocumentStats | null>(null);

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

  const { applyOptions } = editor;
  const mainClass = editor.isEditable ? 'app__main' : 'app__main app__main--single';

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Jsonium</h1>
        <p className="app__tagline">Banco de trabajo JSON local. Cero red.</p>
        <DropZone onFile={handleFile} isCompact />
      </header>

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

      {!editor.isEditable && (
        <p className="notice notice--slim">
          El editor se desactiva por encima de {formatBytes(EDITOR_MAX_BYTES)} para no congelar la
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
