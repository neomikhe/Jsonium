import { useCallback, useEffect, useState } from 'react';
import { DropZone } from './components/DropZone';
import { JsonTree } from './components/JsonTree';
import { StatusBar } from './components/StatusBar';
import type { DocumentStats } from './core/types';
import { useDocument } from './lib/use-document';
import { useJsonTree } from './lib/use-json-tree';

export function App() {
  const { client, status, openFile } = useDocument();
  const root = status.state === 'ready' ? status.result.root : null;
  const { rows, expanded, toggle } = useJsonTree(client, root);
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

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Jsonium</h1>
        <p className="app__tagline">Banco de trabajo JSON local. Cero red.</p>
      </header>

      {status.state === 'ready' && (
        <StatusBar
          name={status.name}
          result={status.result}
          stats={stats}
          onRequestStats={requestStats}
        />
      )}

      <main className="app__main">
        {status.state === 'empty' && <DropZone onFile={handleFile} />}
        {status.state === 'loading' && <p className="notice">Parseando {status.name}...</p>}
        {status.state === 'failed' && (
          <p className="notice notice--error">
            No se pudo parsear {status.name}: {status.error}
          </p>
        )}
        {status.state === 'ready' && <JsonTree rows={rows} expanded={expanded} onToggle={toggle} />}
      </main>

      {status.state !== 'empty' && (
        <footer className="app__footer">
          <DropZone onFile={handleFile} isCompact />
        </footer>
      )}
    </div>
  );
}
