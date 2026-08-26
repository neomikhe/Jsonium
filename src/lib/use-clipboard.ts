import { useCallback, useEffect, useRef, useState } from 'react';
import { useMessages } from './i18n';

const HINT_MS = 2000;

interface ClipboardState {
  hint: string | null;
  copy: (text: string, message: string) => void;
  notify: (message: string) => void;
}

export function useClipboard(): ClipboardState {
  const messages = useMessages();
  const [hint, setHint] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  const notify = useCallback((message: string) => {
    setHint(message);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setHint(null);
    }, HINT_MS);
  }, []);

  const copy = useCallback(
    (text: string, message: string) => {
      void navigator.clipboard
        .writeText(text)
        .then(() => {
          notify(message);
        })
        .catch(() => {
          notify(messages.clipboardBlocked);
        });
    },
    [notify, messages],
  );

  return { hint, copy, notify };
}
