import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '../core/error-message';
import { isCancelled } from '../core/failure';
import { SEARCH_MAX_RESULTS } from '../core/limits';
import type { SearchResult } from '../core/search';
import type { DocumentClient } from './document-client';

const SEARCH_DEBOUNCE_MS = 250;

interface SearchState {
  query: string;
  result: SearchResult | null;
  error: string | null;
  isSearching: boolean;
  setQuery: (query: string) => void;
}

export function useSearch(client: DocumentClient, isReady: boolean): SearchState {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
    setIsSearching(false);
  }, []);

  useEffect(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    if (!isReady || query.trim() === '') {
      clear();
      return undefined;
    }
    setIsSearching(true);
    timerRef.current = window.setTimeout(() => {
      void client
        .search(query, SEARCH_MAX_RESULTS)
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
          setIsSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [client, query, isReady, clear]);

  return { query, result, error, isSearching, setQuery };
}
