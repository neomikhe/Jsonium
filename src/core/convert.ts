import { ROOT_PATH, pathFrom } from './json-path';
import type { PathLink } from './json-path';
import { isArrayValue, isPlainRecord, kindOf } from './json-value';
import { pushReversed } from './stack';
import type { WalkFrame } from './walk';
import { childFrames } from './walk';

const LOSS_MAX = 50;

export type ConvertFormat = 'yaml' | 'toml' | 'csv';

export type LossKind =
  | 'tomlRootNotTable'
  | 'tomlNullDropped'
  | 'csvRootNotRowArray'
  | 'csvRowNotObject'
  | 'csvNestedValue'
  | 'csvRaggedRows'
  | 'csvTypesLost'
  | 'schemaTruncated';

export interface ConvertOutput {
  text: string;
  losses: ConvertLoss[];
  failure: string | null;
}

export interface ConvertLoss {
  kind: LossKind;
  path: string;
}

export function analyzeConversion(value: unknown, format: ConvertFormat): ConvertLoss[] {
  if (format === 'toml') return analyzeToml(value);
  if (format === 'csv') return analyzeCsv(value);
  return [];
}

function analyzeToml(root: unknown): ConvertLoss[] {
  if (!isPlainRecord(root)) {
    return [loss('tomlRootNotTable', ROOT_PATH)];
  }

  const losses: ConvertLoss[] = [];
  const stack: WalkFrame[] = [{ value: root, link: null }];

  while (stack.length > 0 && losses.length < LOSS_MAX) {
    const frame = stack.pop();
    if (frame === undefined) break;
    if (frame.value === null) {
      losses.push(loss('tomlNullDropped', pathFrom(frame.link)));
      continue;
    }
    pushReversed(stack, childFrames(frame));
  }

  return losses;
}

function analyzeCsv(root: unknown): ConvertLoss[] {
  if (!isArrayValue(root)) {
    return [loss('csvRootNotRowArray', ROOT_PATH)];
  }
  if (root.length === 0) return [];

  const badRow = root.findIndex((row) => !isPlainRecord(row));
  if (badRow !== -1) {
    return [loss('csvRowNotObject', `${ROOT_PATH}[${badRow.toString()}]`)];
  }

  return rowLosses(root);
}

function rowLosses(rows: readonly unknown[]): ConvertLoss[] {
  const losses: ConvertLoss[] = [];
  const columns = new Set<string>();

  rows.forEach((row, index) => {
    for (const key of Object.keys(toRecord(row))) columns.add(key);
    collectNested(row, index, losses);
  });

  if (isRagged(rows, columns.size)) {
    losses.push(loss('csvRaggedRows', ROOT_PATH));
  }
  losses.push(loss('csvTypesLost', ROOT_PATH));

  return losses.slice(0, LOSS_MAX);
}

function collectNested(row: unknown, index: number, losses: ConvertLoss[]): void {
  const record = toRecord(row);
  for (const key of Object.keys(record)) {
    if (losses.length >= LOSS_MAX) return;
    if (!isNested(record[key])) continue;
    const link: PathLink = { parent: { parent: null, key: null, index }, key, index: null };
    losses.push(loss('csvNestedValue', pathFrom(link)));
  }
}

function isRagged(rows: readonly unknown[], columnCount: number): boolean {
  return rows.some((row) => Object.keys(toRecord(row)).length !== columnCount);
}

function isNested(value: unknown): boolean {
  const kind = kindOf(value);
  return kind === 'object' || kind === 'array';
}

function toRecord(value: unknown): Record<string, unknown> {
  return isPlainRecord(value) ? value : {};
}

function loss(kind: LossKind, path: string): ConvertLoss {
  return { kind, path };
}
