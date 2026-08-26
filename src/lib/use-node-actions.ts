import { useCallback } from 'react';
import { messageOf } from '../core/error-message';
import type { NodeSummary } from '../core/types';
import type { DocumentClient } from './document-client';
import { useClipboard } from './use-clipboard';

interface NodeActions {
  hint: string | null;
  copyPath: (node: NodeSummary) => void;
  copyValue: (node: NodeSummary) => void;
  copyText: (text: string, message: string) => void;
  notify: (message: string) => void;
}

export function useNodeActions(client: DocumentClient): NodeActions {
  const { hint, copy, notify } = useClipboard();

  const copyPath = useCallback(
    (node: NodeSummary) => {
      void client
        .path(node.id)
        .then((path) => {
          copy(path, 'Ruta copiada al portapapeles');
        })
        .catch((cause: unknown) => {
          notify(messageOf(cause));
        });
    },
    [client, copy, notify],
  );

  const copyValue = useCallback(
    (node: NodeSummary) => {
      void client
        .value(node.id)
        .then((value) => {
          copy(value, 'Valor copiado al portapapeles');
        })
        .catch((cause: unknown) => {
          notify(messageOf(cause));
        });
    },
    [client, copy, notify],
  );

  return { hint, copyPath, copyValue, copyText: copy, notify };
}
