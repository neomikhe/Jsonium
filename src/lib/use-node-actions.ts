import { useCallback } from 'react';
import { messageOf } from '../core/error-message';
import { isCancelled } from '../core/failure';
import type { NodeSummary } from '../core/types';
import type { DocumentClient } from './document-client';
import { describeFailure } from './describe-failure';
import { useMessages } from './i18n';
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
  const messages = useMessages();

  const copyPath = useCallback(
    (node: NodeSummary) => {
      void client
        .path(node.id)
        .then((path) => {
          copy(path, messages.pathCopied);
        })
        .catch((cause: unknown) => {
          if (isCancelled(cause)) return;
          notify(describeFailure(messages, messageOf(cause)));
        });
    },
    [client, copy, notify, messages],
  );

  const copyValue = useCallback(
    (node: NodeSummary) => {
      void client
        .value(node.id)
        .then((value) => {
          copy(value, messages.valueCopied);
        })
        .catch((cause: unknown) => {
          if (isCancelled(cause)) return;
          notify(describeFailure(messages, messageOf(cause)));
        });
    },
    [client, copy, notify, messages],
  );

  return { hint, copyPath, copyValue, copyText: copy, notify };
}
