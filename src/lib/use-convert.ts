import { useCallback, useEffect, useState } from 'react';
import type { Language } from '../core/codegen';
import type { ConvertFormat, ConvertOutput } from '../core/convert';
import { messageOf } from '../core/error-message';
import { ROOT_PATH } from '../core/json-path';
import type { InferResult } from '../core/infer-schema';
import { INDENT_SPACES, MOCK_DEFAULT_COUNT, MOCK_MAX_COUNT } from '../core/limits';
import type { DocumentClient } from './document-client';
import type { DocumentStatus } from './use-document';

export type OutputFormat = ConvertFormat | 'schema' | 'mock' | Language;

const LANGUAGES: ReadonlySet<string> = new Set<Language>([
  'typescript',
  'go',
  'python',
  'rust',
]);

const EXTENSIONS: Record<string, string> = {
  yaml: 'yaml',
  toml: 'toml',
  csv: 'csv',
  schema: 'schema.json',
  mock: 'mock.json',
  typescript: 'ts',
  go: 'go',
  python: 'py',
  rust: 'rs',
};

export function extensionFor(format: OutputFormat): string {
  return EXTENSIONS[format] ?? 'txt';
}

interface ConvertState {
  format: OutputFormat;
  output: ConvertOutput | null;
  error: string | null;
  isRunning: boolean;
  setFormat: (format: OutputFormat) => void;
  mockCount: number;
  setMockCount: (count: number) => void;
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
  const [mockCount, setCount] = useState(MOCK_DEFAULT_COUNT);

  const isReady = status.state === 'ready';

  const run = useCallback(() => {
    setIsRunning(true);
    void produce(client, format, mockCount)
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
  }, [client, format, mockCount]);

  useEffect(() => {
    if (!isActive || !isReady) return;
    run();
  }, [isActive, isReady, status, run]);

  const setMockCount = useCallback((count: number) => {
    setCount(Math.max(1, Math.min(MOCK_MAX_COUNT, count)));
  }, []);

  return { format, output, error, isRunning, setFormat, mockCount, setMockCount };
}

function produce(
  client: DocumentClient,
  format: OutputFormat,
  mockCount: number,
): Promise<ConvertOutput> {
  if (format === 'schema') return client.inferSchema().then(toSchemaOutput);
  if (format === 'mock') return client.mock(mockCount).then(toPlainOutput);
  if (LANGUAGES.has(format)) return client.codegen(format as Language).then(toPlainOutput);
  return client.convert(format as ConvertFormat);
}

function toPlainOutput(text: string): ConvertOutput {
  return { text, losses: [], failure: null };
}

function toSchemaOutput(result: InferResult): ConvertOutput {
  return {
    text: JSON.stringify(result.schema, null, INDENT_SPACES),
    losses: result.isTruncated ? [{ kind: 'schemaTruncated', path: ROOT_PATH }] : [],
    failure: null,
  };
}
