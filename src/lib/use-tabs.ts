import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '../core/error-message';
import { PERSIST_MAX_BYTES } from '../core/limits';
import type { ParseResult } from '../core/types';
import type { DocumentEntry, StoredDocument } from './document-store';
import {
  clearDocuments,
  listDocuments,
  loadDocument,
  removeDocument,
  saveDocument,
} from './document-store';
import type { DocumentStatus } from './use-document';

const PERSIST_DEBOUNCE_MS = 800;

interface TabsState {
  entries: readonly DocumentEntry[];
  activeId: string | null;
  error: string | null;
  isPersisted: boolean;
  open: (id: string) => Promise<StoredDocument | null>;
  close: (id: string) => void;
  clearAll: () => void;
}

export function useTabs(status: DocumentStatus, text: string): TabsState {
  const [entries, setEntries] = useState<readonly DocumentEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const openedRef = useRef(false);
  const lastResultRef = useRef<ParseResult | null>(null);

  const refresh = useCallback(() => {
    void listDocuments()
      .then(setEntries)
      .catch((cause: unknown) => {
        setError(messageOf(cause));
      });
  }, []);

  useEffect(refresh, [refresh]);

  useEffect(() => {
    if (status.state !== 'ready') return;
    if (status.result === lastResultRef.current) return;
    lastResultRef.current = status.result;
    if (openedRef.current) {
      openedRef.current = false;
      return;
    }
    if (status.origin === 'file' || activeId === null) setActiveId(crypto.randomUUID());
  }, [status, activeId]);

  const isPersisted = status.state === 'ready' && status.result.bytes <= PERSIST_MAX_BYTES;

  useEffect(() => {
    if (!isPersisted || activeId === null || text === '') return undefined;
    if (status.state !== 'ready') return undefined;
    const record = {
      id: activeId,
      name: status.name,
      text,
      bytes: status.result.bytes,
      savedAt: Date.now(),
    };
    const timer = window.setTimeout(() => {
      void saveDocument(record)
        .then(refresh)
        .catch((cause: unknown) => {
          setError(messageOf(cause));
        });
    }, PERSIST_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [status, text, activeId, isPersisted, refresh]);

  const open = useCallback(async (id: string) => {
    const stored = await loadDocument(id);
    if (stored === null) return null;
    openedRef.current = true;
    setActiveId(id);
    return stored;
  }, []);

  const close = useCallback(
    (id: string) => {
      void removeDocument(id)
        .then(refresh)
        .catch((cause: unknown) => {
          setError(messageOf(cause));
        });
    },
    [refresh],
  );

  const clearAll = useCallback(() => {
    void clearDocuments()
      .then(refresh)
      .catch((cause: unknown) => {
        setError(messageOf(cause));
      });
  }, [refresh]);

  return { entries, activeId, error, isPersisted, open, close, clearAll };
}
