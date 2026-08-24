import { useCallback, useEffect, useMemo, useState } from 'react';
import { messageOf } from '../core/error-message';
import type { ParseResult } from '../core/types';
import { DocumentClient } from './document-client';

export type DocumentStatus =
  | { state: 'empty' }
  | { state: 'loading'; name: string }
  | { state: 'ready'; name: string; result: ParseResult }
  | { state: 'failed'; name: string; error: string };

export function useDocument() {
  const client = useMemo(() => new DocumentClient(), []);
  const [status, setStatus] = useState<DocumentStatus>({ state: 'empty' });

  useEffect(() => () => { client.dispose(); }, [client]);

  const openFile = useCallback(
    async (file: File) => {
      setStatus({ state: 'loading', name: file.name });
      try {
        const result = await client.parseFile(file);
        setStatus({ state: 'ready', name: file.name, result });
      } catch (error) {
        setStatus({ state: 'failed', name: file.name, error: messageOf(error) });
      }
    },
    [client],
  );

  return { client, status, openFile };
}
