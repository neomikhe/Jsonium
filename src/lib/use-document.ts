import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { messageOf } from '../core/error-message';
import { formatOfFile } from '../core/file-format';
import type { ParseResult } from '../core/types';
import { DocumentClient } from './document-client';

const PASTED_NAME = 'pegado.json';

export type DocumentOrigin = 'file' | 'editor';

export type DocumentStatus =
  | { state: 'empty' }
  | { state: 'loading'; name: string }
  | { state: 'ready'; name: string; origin: DocumentOrigin; revision: number; result: ParseResult }
  | { state: 'failed'; name: string; error: string };

export function useDocument() {
  const client = useMemo(() => new DocumentClient(), []);
  const [status, setStatus] = useState<DocumentStatus>({ state: 'empty' });
  const revisionRef = useRef(0);

  useEffect(
    () => () => {
      client.dispose();
    },
    [client],
  );

  const openFile = useCallback(
    async (file: File) => {
      setStatus({ state: 'loading', name: file.name });
      try {
        const format = formatOfFile(file.name);
        const result =
          format === null ? await client.parseFile(file) : await client.importFile(file, format);
        revisionRef.current += 1;
        setStatus({
          state: 'ready',
          name: file.name,
          origin: 'file',
          revision: revisionRef.current,
          result,
        });
      } catch (error) {
        setStatus({ state: 'failed', name: file.name, error: messageOf(error) });
      }
    },
    [client],
  );

  const applyText = useCallback(
    async (text: string, name?: string) => {
      const result = await client.parseText(text);
      revisionRef.current += 1;
      const revision = revisionRef.current;
      setStatus((current) => ({
        state: 'ready',
        name: name ?? (current.state === 'ready' ? current.name : PASTED_NAME),
        origin: 'editor',
        revision,
        result,
      }));
    },
    [client],
  );

  return { client, status, openFile, applyText };
}
