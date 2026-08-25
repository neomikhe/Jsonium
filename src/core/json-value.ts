import type { JsonKind } from './types';

const PREVIEW_MAX_LENGTH = 48;
const ELLIPSIS = '\u2026';

export function isArrayValue(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function kindOf(value: unknown): JsonKind {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') return type;
  return 'object';
}

export function countChildren(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (isPlainRecord(value)) return Object.keys(value).length;
  return 0;
}

export function previewOf(value: unknown): string {
  const kind = kindOf(value);
  if (kind === 'array') return `[ ${String(countChildren(value))} ]`;
  if (kind === 'object') return `{ ${String(countChildren(value))} }`;
  if (kind === 'string') return truncate(JSON.stringify(value));
  return String(value);
}

function truncate(text: string): string {
  if (text.length <= PREVIEW_MAX_LENGTH) return text;
  return `${text.slice(0, PREVIEW_MAX_LENGTH)}${ELLIPSIS}`;
}
