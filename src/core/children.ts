import { isPlainRecord } from './json-value';

export interface ChildEntry {
  key: string | null;
  index: number | null;
  value: unknown;
}

export function childrenOf(value: unknown, offset: number, limit: number): ChildEntry[] {
  if (Array.isArray(value)) return arrayChildren(value, offset, limit);
  if (isPlainRecord(value)) return recordChildren(value, offset, limit);
  return [];
}

function arrayChildren(value: readonly unknown[], offset: number, limit: number): ChildEntry[] {
  return value
    .slice(offset, offset + limit)
    .map((item, position) => ({ key: null, index: offset + position, value: item }));
}

function recordChildren(
  value: Record<string, unknown>,
  offset: number,
  limit: number,
): ChildEntry[] {
  return Object.keys(value)
    .slice(offset, offset + limit)
    .map((key) => ({ key, index: null, value: value[key] }));
}
