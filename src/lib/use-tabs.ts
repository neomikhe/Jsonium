import { useCallback, useEffect, useRef, useState } from 'react';
import { PERSIST_MAX_BYTES } from '../core/limits';
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
  hasFailed: boolean;
  isPersisted: boolean;
  open: (id: string) => Promise<StoredDocument | null>;
  close: (id: string) => void;
  clearAll: () => void;
}

export function useTabs(status: DocumentStatus, text: string): TabsState {
  const [entries, setEntries] = useState<readonly DocumentEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const fail = useCallback(() => {
    setHasFailed(true);
  }, []);
  const openedRef = useRef(false);
  const lastRevisionRef = useRef(0);

  const refresh = useCallback(() => {
    void listDocuments().then(setEntries).catch(fail);
  }, [fail]);

  useEffect(refresh, [refresh]);

  useEffect(() => {
    if (status.state !== 'ready') return;
    if (status.revision === lastRevisionRef.current) return;
    lastRevisionRef.current = status.revision;
    if (openedRef.current) {
      openedRef.current = false;
      return;
    }
    if (status.origin !== 'file' && activeId !== null) return;
    setActiveId(idForName(entries, status.name) ?? crypto.randomUUID());
  }, [status, activeId, entries]);

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
      void saveDocument(record).then(refresh).catch(fail);
    }, PERSIST_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [status, text, activeId, isPersisted, refresh, fail]);

  const open = useCallback(async (id: string) => {
    const stored = await loadDocument(id);
    if (stored === null) return null;
    openedRef.current = true;
    setActiveId(id);
    return stored;
  }, []);

  const close = useCallback(
    (id: string) => {
      void removeDocument(id).then(refresh).catch(fail);
    },
    [refresh, fail],
  );

  const clearAll = useCallback(() => {
    void clearDocuments().then(refresh).catch(fail);
  }, [refresh, fail]);

  return { entries, activeId, hasFailed, isPersisted, open, close, clearAll };
}

function idForName(entries: readonly DocumentEntry[], name: string): string | null {
  return entries.find((entry) => entry.name === name)?.id ?? null;
}
