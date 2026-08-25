import type { ConvertFormat } from './convert';

const BY_EXTENSION = new Map<string, ConvertFormat>([
  ['yaml', 'yaml'],
  ['yml', 'yaml'],
  ['toml', 'toml'],
  ['csv', 'csv'],
  ['tsv', 'csv'],
]);

export const ACCEPTED_FILES = '.json,.yaml,.yml,.toml,.csv,.tsv,application/json,text/csv';

export function formatOfFile(name: string): ConvertFormat | null {
  const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  return BY_EXTENSION.get(extension) ?? null;
}
