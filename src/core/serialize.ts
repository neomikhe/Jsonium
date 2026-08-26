import { isPlainRecord } from './json-value';
import { DocumentFailure } from './failure';
import { pushReversed } from './stack';

export interface SerializeOptions {
  indent: number;
  sortKeys: boolean;
  maxLength?: number;
}

type ValueEmit = { kind: 'value'; value: unknown; depth: number };
type Emit = { kind: 'raw'; text: string } | ValueEmit;

export function serialize(value: unknown, options: SerializeOptions): string {
  const out: string[] = [];
  const stack: Emit[] = [{ kind: 'value', value, depth: 0 }];
  let total = 0;

  while (stack.length > 0) {
    const item = stack.pop();
    if (item === undefined) break;
    const text = resolve(item, options, stack);
    if (text === null) continue;
    out.push(text);
    total += text.length;
    guardLength(total, options);
  }

  return out.join('');
}

function resolve(item: Emit, options: SerializeOptions, stack: Emit[]): string | null {
  if (item.kind === 'raw') return item.text;
  const emits = expand(item, options);
  if (emits === null) return JSON.stringify(item.value);
  pushReversed(stack, emits);
  return null;
}

function guardLength(total: number, options: SerializeOptions): void {
  const max = options.maxLength;
  if (max !== undefined && total > max) {
    throw new DocumentFailure('value-too-large');
  }
}

function expand(item: ValueEmit, options: SerializeOptions): Emit[] | null {
  if (Array.isArray(item.value)) return arrayEmits(item.value, item.depth, options);
  if (isPlainRecord(item.value)) return recordEmits(item.value, item.depth, options);
  return null;
}

function arrayEmits(items: readonly unknown[], depth: number, options: SerializeOptions): Emit[] {
  if (items.length === 0) return [raw('[]')];
  const inner = depth + 1;
  const emits: Emit[] = [raw('[')];
  items.forEach((child, index) => {
    if (index > 0) emits.push(raw(','));
    emits.push(raw(gap(inner, options)), { kind: 'value', value: child, depth: inner });
  });
  emits.push(raw(gap(depth, options)), raw(']'));
  return emits;
}

function recordEmits(
  record: Record<string, unknown>,
  depth: number,
  options: SerializeOptions,
): Emit[] {
  const keys = sortedKeys(record, options);
  if (keys.length === 0) return [raw('{}')];
  const inner = depth + 1;
  const separator = options.indent > 0 ? ': ' : ':';
  const emits: Emit[] = [raw('{')];
  keys.forEach((key, index) => {
    if (index > 0) emits.push(raw(','));
    emits.push(raw(gap(inner, options)), raw(`${JSON.stringify(key)}${separator}`));
    emits.push({ kind: 'value', value: record[key], depth: inner });
  });
  emits.push(raw(gap(depth, options)), raw('}'));
  return emits;
}

function sortedKeys(record: Record<string, unknown>, options: SerializeOptions): string[] {
  const keys = Object.keys(record);
  return options.sortKeys ? keys.sort() : keys;
}

function gap(depth: number, options: SerializeOptions): string {
  if (options.indent === 0) return '';
  return `\n${' '.repeat(depth * options.indent)}`;
}

function raw(text: string): Emit {
  return { kind: 'raw', text };
}
