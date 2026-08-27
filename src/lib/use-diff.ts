import { useCallback, useEffect, useState } from 'react';
import type { DiffResult } from '../core/diff';
import { messageOf } from '../core/error-message';
import { isCancelled } from '../core/failure';
import { DIFF_MAX_CHANGES } from '../core/limits';
import type { DocumentClient } from './document-client';
import type { DocumentStatus } from './use-document';

interface DiffState {
  compareName: string | null;
  arrayKey: string;
  result: DiffResult | null;
  error: string | null;
  isRunning: boolean;
  setArrayKey: (key: string) => void;
  loadCompare: (file: File) => void;
  clear: () => void;
}

export function useDiff(client: DocumentClient, status: DocumentStatus): DiffState {
  const [compareName, setCompareName] = useState<string | null>(null);
  const [arrayKey, setArrayKey] = useState('');
  const [result, setResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const isReady = status.state === 'ready';

  useEffect(() => {
    if (compareName === null || !isReady) return;
    setIsRunning(true);
    void client
      .diff({ arrayKey: normalizeKey(arrayKey), limit: DIFF_MAX_CHANGES })
      .then((found) => {
        setResult(found);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (isCancelled(cause)) return;
        setError(messageOf(cause));
        setResult(null);
      })
      .finally(() => {
        setIsRunning(false);
      });
  }, [client, compareName, arrayKey, isReady, status]);

  const loadCompare = useCallback(
    (file: File) => {
      void client
        .compareFile(file)
        .then(() => {
          setCompareName(file.name);
          setError(null);
        })
        .catch((cause: unknown) => {
          if (isCancelled(cause)) return;
          setError(messageOf(cause));
        });
    },
    [client],
  );

  const clear = useCallback(() => {
    void client
      .clearCompare()
      .then(() => {
        setCompareName(null);
        setResult(null);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (isCancelled(cause)) return;
        setError(messageOf(cause));
      });
  }, [client]);

  return { compareName, arrayKey, result, error, isRunning, setArrayKey, loadCompare, clear };
}

function normalizeKey(arrayKey: string): string | null {
  const trimmed = arrayKey.trim();
  return trimmed === '' ? null : trimmed;
}
