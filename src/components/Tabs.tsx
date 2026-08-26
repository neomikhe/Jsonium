import type { DocumentEntry } from '../lib/document-store';
import { formatBytes } from '../lib/format';
import { useMessages } from '../lib/i18n';

interface TabsProps {
  entries: readonly DocumentEntry[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onClose: (id: string) => void;
  onClearAll: () => void;
}

export function Tabs({ entries, activeId, onOpen, onClose, onClearAll }: TabsProps) {
  const messages = useMessages();
  if (entries.length === 0) return null;

  return (
    <div className="tabs" role="tablist" aria-label={messages.recentDocuments}>
      {entries.map((entry) => (
        <span key={entry.id} className={entry.id === activeId ? 'tab tab--active' : 'tab'}>
          <button
            type="button"
            className="tab__open"
            role="tab"
            aria-selected={entry.id === activeId}
            title={`${entry.name} · ${formatBytes(entry.bytes)}`}
            onClick={() => {
              onOpen(entry.id);
            }}
          >
            {entry.name}
          </button>
          <button
            type="button"
            className="tab__close"
            aria-label={messages.forget(entry.name)}
            onClick={() => {
              onClose(entry.id);
            }}
          >
            ×
          </button>
        </span>
      ))}
      <button type="button" className="tabs__clear" onClick={onClearAll}>
        {messages.clearSaved}
      </button>
    </div>
  );
}
