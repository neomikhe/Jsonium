import { useCallback, useEffect, useRef, useState } from 'react';
import { DocumentPane } from './components/DocumentPane';
import type { PaneMode } from './lib/pane-mode';
import { DropZone } from './components/DropZone';
import { EditorPane } from './components/EditorPane';
import { StatsPanel } from './components/StatsPanel';
import { StatusBar } from './components/StatusBar';
import { Tabs } from './components/Tabs';
import { Toolbar } from './components/Toolbar';
import { EDITOR_MAX_BYTES, INDENT_SPACES } from './core/limits';
import { extensionFor } from './lib/use-convert';
import type { OutputFormat } from './lib/use-convert';
import type { DiffResult } from './core/diff';
import { locatePath } from './core/locate';
import type { Span } from './core/locate';
import type { DocumentStats, NodeSummary } from './core/types';
import { formatBytes } from './lib/format';
import { downloadText } from './lib/download';
import { decodeShare, encodeShare } from './lib/share-url';
import { MessagesContext } from './lib/i18n';
import { useLocale } from './lib/use-locale';
import { useTheme } from './lib/use-theme';
import { Preferences } from './components/Preferences';
import { useDocument } from './lib/use-document';
import { useEditorText } from './lib/use-editor-text';
import { useJsonTree } from './lib/use-json-tree';
import { useNodeActions } from './lib/use-node-actions';
import { useConvert } from './lib/use-convert';
import { useDiff } from './lib/use-diff';
import { useQuery } from './lib/use-query';
import { useSearch } from './lib/use-search';
import { useShortcuts } from './lib/use-shortcuts';
import { useTabs } from './lib/use-tabs';
import { useValidate } from './lib/use-validate';

export function App() {
  const { messages, toggle: toggleLocale } = useLocale();
  const { theme, next: nextTheme, cycle: cycleTheme } = useTheme();
  const { client, status, openFile, applyText } = useDocument();
  const root = status.state === 'ready' ? status.result.root : null;
  const { rows, expanded, toggle } = useJsonTree(client, root);
  const editor = useEditorText(client, status, applyText);
  const search = useSearch(client, status.state === 'ready');
  const { hint, copyPath, copyValue, copyText, notify } = useNodeActions(client);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const tabs = useTabs(status, editor.text);
  const [reveal, setReveal] = useState<Span | null>(null);
  const sharedRef = useRef(false);
  const [mode, setMode] = useState<PaneMode>('tree');
  const diffState = useDiff(client, status);
  const convertState = useConvert(client, status, mode === 'convert');
  const queryState = useQuery(client, status.state === 'ready');
  const validateState = useValidate(client, status);

  useEffect(() => {
    setStats(null);
  }, [root]);

  useEffect(() => {
    if (sharedRef.current) return;
    const shared = decodeShare(window.location.hash);
    if (shared === null) return;
    sharedRef.current = true;
    editor.loadText(shared);
    void applyText(shared, messages.sharedName);
  }, [editor, applyText, messages]);

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
  const canEdit = status.state === 'ready' && editor.isEditable;

  const format = useCallback(() => {
    if (canEdit) applyOptions({ indent: INDENT_SPACES, sortKeys: false });
  }, [canEdit, applyOptions]);

  const minify = useCallback(() => {
    if (canEdit) applyOptions({ indent: 0, sortKeys: false });
  }, [canEdit, applyOptions]);

  const sortKeys = useCallback(() => {
    if (canEdit) applyOptions({ indent: INDENT_SPACES, sortKeys: true });
  }, [canEdit, applyOptions]);

  const share = useCallback(() => {
    const { hash, failure } = encodeShare(editor.text);
    if (hash === null) {
      notify(messages.shareFailure[failure ?? 'empty']);
      return;
    }
    const { origin, pathname } = window.location;
    copyText(`${origin}${pathname}${hash}`, messages.linkCopied);
  }, [editor.text, copyText, notify, messages]);

  useShortcuts([
    { key: 'f', run: format },
    { key: 'm', run: minify },
    { key: 'o', run: sortKeys },
  ]);

  const revealPath = useCallback(
    (path: string) => {
      if (!editor.isEditable) return;
      setReveal(locatePath(editor.text, path));
    },
    [editor.isEditable, editor.text],
  );

  const revealNode = useCallback(
    (node: NodeSummary) => {
      void client
        .path(node.id)
        .then(revealPath)
        .catch(() => {
          setReveal(null);
        });
    },
    [client, revealPath],
  );

  const exportDiff = useCallback((result: DiffResult) => {
    downloadText(JSON.stringify(result, null, INDENT_SPACES), 'jsonium-diff.json');
  }, []);

  const downloadConversion = useCallback((text: string, format: OutputFormat) => {
    downloadText(text, `jsonium.${extensionFor(format)}`);
  }, []);

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
    <MessagesContext.Provider value={messages}>
      <div className="app">
        <header className="app__header">
          <h1 className="app__title">Jsonium</h1>
          <p className="app__tagline">{messages.tagline}</p>
          <DropZone onFile={handleFile} isCompact />
          <Preferences
            theme={theme}
            nextTheme={nextTheme}
            onCycleTheme={cycleTheme}
            onSwitchLanguage={toggleLocale}
          />
        </header>

        <Tabs
          entries={tabs.entries}
          activeId={tabs.activeId}
          onOpen={openTab}
          onClose={tabs.close}
          onClearAll={tabs.clearAll}
        />

        <Toolbar
          isDisabled={!canEdit}
          onFormat={format}
          onMinify={minify}
          onSortKeys={sortKeys}
          onShare={share}
        />

        {status.state === 'ready' && (
          <StatusBar
            name={status.name}
            result={status.result}
            stats={stats}
            onRequestStats={requestStats}
          />
        )}

        {tabs.hasFailed && <p className="notice notice--slim">{messages.storageUnavailable}</p>}

        {stats !== null && <StatsPanel stats={stats} />}

        {!editor.isEditable && (
          <p className="notice notice--slim">{messages.oversize(formatBytes(EDITOR_MAX_BYTES))}</p>
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
              diff={diffState}
              convert={convertState}
              query={queryState}
              validate={validateState}
              mode={mode}
              onModeChange={setMode}
              actions={{
                onToggle: toggle,
                onCopyPath: copyPath,
                onCopyValue: copyValue,
                onCopyText: copyText,
                onReveal: revealNode,
              }}
              onFile={handleFile}
              onRevealPath={revealPath}
              onExportDiff={exportDiff}
              onDownload={downloadConversion}
            />
          </section>
        </main>

        <output className="hint" aria-live="polite">
          {hint ?? ''}
        </output>
      </div>
    </MessagesContext.Provider>
  );
}
