import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '../core/error-message';
import { EDITOR_MAX_BYTES, INDENT_SPACES } from '../core/limits';
import type { RepairFix } from '../core/repair';
import type { SerializeOptions } from '../core/serialize';
import type { DocumentClient } from './document-client';
import type { DocumentStatus } from './use-document';

const PARSE_DEBOUNCE_MS = 300;

interface EditorTextState {
  text: string;
  error: string | null;
  fixes: readonly RepairFix[];
  isEditable: boolean;
  canRepair: boolean;
  handleChange: (next: string) => void;
  applyOptions: (options: SerializeOptions) => void;
  applyRepair: () => void;
}

export function useEditorText(
  client: DocumentClient,
  status: DocumentStatus,
  applyText: (text: string) => Promise<void>,
): EditorTextState {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fixes, setFixes] = useState<readonly RepairFix[]>([]);
  const timerRef = useRef<number | null>(null);

  const isEditable = status.state !== 'ready' || status.result.bytes <= EDITOR_MAX_BYTES;

  const applyOptions = useCallback(
    (options: SerializeOptions) => {
      void client
        .serialize(options)
        .then(async (serialized) => {
          setText(serialized);
          setError(null);
          if (options.sortKeys) await applyText(serialized);
        })
        .catch((cause: unknown) => {
          setError(messageOf(cause));
        });
    },
    [client, applyText],
  );

  const applyRepair = useCallback(() => {
    void client
      .repair(text)
      .then(async (result) => {
        setText(result.text);
        setFixes(result.fixes);
        await applyText(result.text);
        setError(null);
      })
      .catch((cause: unknown) => {
        setError(messageOf(cause));
      });
  }, [client, text, applyText]);

  useEffect(() => {
    if (status.state !== 'ready' || status.origin !== 'file') return;
    setFixes([]);
    if (status.result.bytes > EDITOR_MAX_BYTES) {
      setText('');
      setError(null);
      return;
    }
    applyOptions({ indent: INDENT_SPACES, sortKeys: false });
  }, [status, applyOptions]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleChange = useCallback(
    (next: string) => {
      setText(next);
      setFixes([]);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        schedule(next, applyText, setError);
      }, PARSE_DEBOUNCE_MS);
    },
    [applyText],
  );

  const canRepair = error !== null && isEditable && text.trim() !== '';

  return {
    text,
    error,
    fixes,
    isEditable,
    canRepair,
    handleChange,
    applyOptions,
    applyRepair,
  };
}

function schedule(
  next: string,
  applyText: (text: string) => Promise<void>,
  setError: (message: string | null) => void,
): void {
  if (next.trim() === '') {
    setError(null);
    return;
  }
  void applyText(next)
    .then(() => {
      setError(null);
    })
    .catch((cause: unknown) => {
      setError(messageOf(cause));
    });
}
