import { useEffect, useRef } from 'react';

export interface Shortcut {
  key: string;
  run: () => void;
}

export function useShortcuts(shortcuts: readonly Shortcut[]): void {
  const latest = useRef(shortcuts);

  useEffect(() => {
    latest.current = shortcuts;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!hasModifier(event) || !event.shiftKey) return;
      const match = latest.current.find((shortcut) => shortcut.key === event.key.toLowerCase());
      if (match === undefined) return;
      event.preventDefault();
      match.run();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}

function hasModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey;
}
