import { identityOf } from './identity';
import type { PathLink } from './json-path';
import { pathFrom } from './json-path';
import { isArrayValue, isPlainRecord, kindOf, previewOf } from './json-value';
import { pushReversed } from './stack';

export type DiffKind = 'added' | 'removed' | 'changed';

export interface DiffChange {
  kind: DiffKind;
  path: string;
  before: string | null;
  after: string | null;
}

export interface DiffOptions {
  arrayKey: string | null;
  limit: number;
}

export interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
}

export interface DiffResult {
  changes: DiffChange[];
  summary: DiffSummary;
  isTruncated: boolean;
  scanMs: number;
}

interface Pair {
  left: unknown;
  right: unknown;
  link: PathLink | null;
}

type Task = { pair: Pair; change?: undefined } | { change: DiffChange; pair?: undefined };

interface Sink {
  changes: DiffChange[];
  stack: Task[];
}

export function diff(left: unknown, right: unknown, options: DiffOptions): DiffResult {
  const startedAt = performance.now();
  const sink: Sink = { changes: [], stack: [{ pair: { left, right, link: null } }] };

  while (sink.stack.length > 0 && sink.changes.length < options.limit) {
    const task = sink.stack.pop();
    if (task === undefined) break;
    if (task.change !== undefined) {
      sink.changes.push(task.change);
      continue;
    }
    comparePair(task.pair, options, sink);
  }

  return {
    changes: sink.changes,
    summary: summarize(sink.changes),
    isTruncated: sink.changes.length >= options.limit,
    scanMs: performance.now() - startedAt,
  };
}

function comparePair(pair: Pair, options: DiffOptions, sink: Sink): void {
  const leftKind = kindOf(pair.left);
  if (leftKind !== kindOf(pair.right)) {
    sink.changes.push(changed(pair));
    return;
  }
  if (leftKind === 'object') {
    pushReversed(sink.stack, recordTasks(pair));
    return;
  }
  if (leftKind === 'array') {
    pushReversed(sink.stack, arrayTasks(pair, options));
    return;
  }
  if (pair.left !== pair.right) sink.changes.push(changed(pair));
}

function recordTasks(pair: Pair): Task[] {
  const left = toRecord(pair.left);
  const right = toRecord(pair.right);
  const leftKeys = new Set(Object.keys(left));
  const tasks: Task[] = [];

  for (const key of leftKeys) {
    const link = keyLink(pair.link, key);
    if (Object.hasOwn(right, key))
      tasks.push({ pair: { left: left[key], right: right[key], link } });
    else tasks.push({ change: removed(link, left[key]) });
  }
  for (const key of Object.keys(right)) {
    if (!leftKeys.has(key)) tasks.push({ change: added(keyLink(pair.link, key), right[key]) });
  }

  return tasks;
}

function arrayTasks(pair: Pair, options: DiffOptions): Task[] {
  if (options.arrayKey === null) return indexTasks(pair);
  return keyedTasks(pair, options.arrayKey);
}

function indexTasks(pair: Pair): Task[] {
  const left = toArray(pair.left);
  const right = toArray(pair.right);
  const total = Math.max(left.length, right.length);
  const tasks: Task[] = [];

  for (let index = 0; index < total; index += 1) {
    const link = indexLink(pair.link, index);
    if (index >= right.length) tasks.push({ change: removed(link, left[index]) });
    else if (index >= left.length) tasks.push({ change: added(link, right[index]) });
    else tasks.push({ pair: { left: left[index], right: right[index], link } });
  }

  return tasks;
}

function keyedTasks(pair: Pair, arrayKey: string): Task[] {
  const left = indexByKey(toArray(pair.left), arrayKey);
  const right = indexByKey(toArray(pair.right), arrayKey);
  const tasks: Task[] = [];

  for (const [id, leftItem] of left) {
    const link = tokenLink(pair.link, arrayKey, id);
    if (right.has(id)) tasks.push({ pair: { left: leftItem, right: right.get(id), link } });
    else tasks.push({ change: removed(link, leftItem) });
  }
  for (const [id, rightItem] of right) {
    if (!left.has(id)) tasks.push({ change: added(tokenLink(pair.link, arrayKey, id), rightItem) });
  }

  return tasks;
}

function indexByKey(items: readonly unknown[], arrayKey: string): Map<string, unknown> {
  const byKey = new Map<string, unknown>();
  items.forEach((item, index) => {
    byKey.set(identityOf(item, arrayKey, index), item);
  });
  return byKey;
}

function keyLink(parent: PathLink | null, key: string): PathLink {
  return { parent, key, index: null };
}

function indexLink(parent: PathLink | null, index: number): PathLink {
  return { parent, key: null, index };
}

function tokenLink(parent: PathLink | null, arrayKey: string, id: string): PathLink {
  return { parent, key: null, index: null, token: `[${arrayKey}=${id}]` };
}

function changed(pair: Pair): DiffChange {
  return {
    kind: 'changed',
    path: pathFrom(pair.link),
    before: previewOf(pair.left),
    after: previewOf(pair.right),
  };
}

function removed(link: PathLink, value: unknown): DiffChange {
  return { kind: 'removed', path: pathFrom(link), before: previewOf(value), after: null };
}

function added(link: PathLink, value: unknown): DiffChange {
  return { kind: 'added', path: pathFrom(link), before: null, after: previewOf(value) };
}

function summarize(changes: readonly DiffChange[]): DiffSummary {
  const summary: DiffSummary = { added: 0, removed: 0, changed: 0 };
  for (const change of changes) summary[change.kind] += 1;
  return summary;
}

function toRecord(value: unknown): Record<string, unknown> {
  return isPlainRecord(value) ? value : {};
}

function toArray(value: unknown): readonly unknown[] {
  return isArrayValue(value) ? value : [];
}
