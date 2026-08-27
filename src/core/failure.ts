export const FAILURE_CODES = [
  'worker-crashed',
  'client-disposed',
  'document-missing',
  'document-too-large',
  'compare-missing',
  'node-unknown',
  'value-too-large',
  'toml-root',
  'csv-root',
  'circular-reference',
  'query-empty',
  'query-root',
  'query-separator',
  'query-name-dot',
  'query-name-descend',
  'query-bracket',
  'query-index',
  'query-bound',
] as const;

export type FailureCode = (typeof FAILURE_CODES)[number];

export interface Failure {
  code: FailureCode;
  detail: string;
}

const KNOWN = new Set<string>(FAILURE_CODES);
const SEPARATOR = ':';

export class DocumentFailure extends Error {
  constructor(
    readonly code: FailureCode,
    detail = '',
    options?: ErrorOptions,
  ) {
    super(detail === '' ? code : `${code}${SEPARATOR}${detail}`, options);
    this.name = 'DocumentFailure';
  }
}

export function readFailure(message: string): Failure | null {
  const at = message.indexOf(SEPARATOR);
  const code = at === -1 ? message : message.slice(0, at);
  if (!KNOWN.has(code)) return null;
  return { code: code as FailureCode, detail: at === -1 ? '' : message.slice(at + 1) };
}

export function isCancelled(cause: unknown): boolean {
  return cause instanceof DocumentFailure && cause.code === 'client-disposed';
}
