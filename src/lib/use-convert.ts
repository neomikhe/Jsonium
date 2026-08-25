import { useCallback, useEffect, useState } from 'react';
import type { ConvertFormat, ConvertOutput } from '../core/convert';
import { messageOf } from '../core/error-message';
import type { DocumentClient } from './document-client';
import type { DocumentStatus } from './use-document';

interface ConvertState {
  format: ConvertFormat;
  output: ConvertOutput | null;
  error: string | null;
  isRunning: boolean;
  setFormat: (format: ConvertFormat) => void;
}

export function useConvert(
  client: DocumentClient,
  status: DocumentStatus,
  isActive: boolean,
): ConvertState {
  const [format, setFormat] = useState<ConvertFormat>('yaml');
  const [output, setOutput] = useState<ConvertOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const isReady = status.state === 'ready';

  const run = useCallback(() => {
    setIsRunning(true);
    void client
      .convert(format)
      .then((result) => {
        setOutput(result);
        setError(null);
      })
      .catch((cause: unknown) => {
        setError(messageOf(cause));
        setOutput(null);
      })
      .finally(() => {
        setIsRunning(false);
      });
  }, [client, format]);

  useEffect(() => {
    if (!isActive || !isReady) return;
    run();
  }, [isActive, isReady, status, run]);

  return { format, output, error, isRunning, setFormat };
}
