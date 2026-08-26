import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '../core/error-message';
import { VALIDATE_MAX_ERRORS } from '../core/limits';
import type { ValidationResult } from '../core/validate-schema';
import type { DocumentClient } from './document-client';
import type { DocumentStatus } from './use-document';

interface ValidateState {
  schemaName: string | null;
  result: ValidationResult | null;
  error: string | null;
  isRunning: boolean;
  loadSchema: (file: File) => void;
  clear: () => void;
}

export function useValidate(client: DocumentClient, status: DocumentStatus): ValidateState {
  const [schema, setSchema] = useState<File | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const isReady = status.state === 'ready';

  useEffect(() => {
    if (schema === null || !isReady) return;
    setIsRunning(true);
    void client
      .validate(schema, VALIDATE_MAX_ERRORS)
      .then((found) => {
        setResult(found);
        setError(null);
      })
      .catch((cause: unknown) => {
        setError(messageOf(cause));
        setResult(null);
      })
      .finally(() => {
        setIsRunning(false);
      });
  }, [client, schema, isReady, status]);

  const loadSchema = useCallback((file: File) => {
    setSchema(file);
    setError(null);
  }, []);

  const clear = useCallback(() => {
    setSchema(null);
    setResult(null);
    setError(null);
  }, []);

  return { schemaName: schema?.name ?? null, result, error, isRunning, loadSchema, clear };
}
