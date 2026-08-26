import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '../core/error-message';
import type { QueryResult } from '../core/jsonpath';
import { QUERY_MAX_RESULTS } from '../core/limits';
import type { DocumentClient } from './document-client';

const QUERY_DEBOUNCE_MS = 250;

interface QueryState {
  expression: string;
  result: QueryResult | null;
  error: string | null;
  isRunning: boolean;
  setExpression: (expression: string) => void;
}

export function useQuery(client: DocumentClient, isReady: boolean): QueryState {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  const run = useCallback(
    (next: string) => {
      setIsRunning(true);
      void client
        .query(next, QUERY_MAX_RESULTS)
        .then((found) => {
          setResult(found);
          setError(null);
        })
        .catch((cause: unknown) => {
          setError(messageOf(cause));
          setResult(null);
        })
        .finally(() => {
          setIsRunning(false);
        });
    },
    [client],
  );

  const update = useCallback(
    (next: string) => {
      setExpression(next);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      if (next.trim() === '' || !isReady) {
        setResult(null);
        setError(null);
        return;
      }
      timerRef.current = window.setTimeout(() => {
        run(next);
      }, QUERY_DEBOUNCE_MS);
    },
    [isReady, run],
  );

  return { expression, result, error, isRunning, setExpression: update };
}
