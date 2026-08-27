import { isPlainRecord, kindOf } from './json-value';

export function identityOf(item: unknown, arrayKey: string, index: number): string {
  const fallback = `#${index.toString()}`;
  if (!isPlainRecord(item)) return fallback;
  const value = item[arrayKey];
  return isUsableId(value) ? String(value) : fallback;
}

function isUsableId(value: unknown): value is string | number | boolean {
  const kind = kindOf(value);
  return kind === 'string' || kind === 'number' || kind === 'boolean';
}
