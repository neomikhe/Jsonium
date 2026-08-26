import { useCallback, useEffect, useState } from 'react';
import type { ConvertFormat, ConvertOutput } from '../core/convert';
import { messageOf } from '../core/error-message';
import type { InferResult } from '../core/infer-schema';
import { INDENT_SPACES } from '../core/limits';
import type { DocumentClient } from './document-client';
import type { DocumentStatus } from './use-document';

export type OutputFormat = ConvertFormat | 'schema';

interface ConvertState {
  format: OutputFormat;
  output: ConvertOutput | null;
  error: string | null;
  isRunning: boolean;
  setFormat: (format: OutputFormat) => void;
}

export function useConvert(
  client: DocumentClient,
  status: DocumentStatus,
  isActive: boolean,
): ConvertState {
  const [format, setFormat] = useState<OutputFormat>('yaml');
  const [output, setOutput] = useState<ConvertOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const isReady = status.state === 'ready';

  const run = useCallback(() => {
    setIsRunning(true);
    void produce(client, format)
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

function produce(client: DocumentClient, format: OutputFormat): Promise<ConvertOutput> {
  if (format !== 'schema') return client.convert(format);
  return client.inferSchema().then(toSchemaOutput);
}

function toSchemaOutput(result: InferResult): ConvertOutput {
  return {
    text: JSON.stringify(result.schema, null, INDENT_SPACES),
    losses: result.isTruncated
      ? [
          {
            kind: 'schemaTruncated',
            path: '$',
            detail: 'El documento es demasiado profundo o variado: el esquema esta recortado',
          },
        ]
      : [],
    failure: null,
  };
}
