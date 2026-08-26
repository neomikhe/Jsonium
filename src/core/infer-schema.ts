import { isArrayValue, isPlainRecord, kindOf } from './json-value';
import { pushReversed } from './stack';
import type { JsonKind } from './types';

const SCHEMA_URL = 'http://json-schema.org/draft-07/schema#';
const ROOT = '$';
const ITEM = '[]';
const MAX_DEPTH = 64;
const MAX_SHAPES = 5000;

export type JsonSchema = Record<string, unknown>;

export interface InferResult {
  schema: JsonSchema;
  isTruncated: boolean;
  scanMs: number;
}

interface Shape {
  self: string;
  parent: string | null;
  key: string | null;
  isItem: boolean;
  kinds: Set<JsonKind>;
  count: number;
  objectCount: number;
}

interface Frame {
  value: unknown;
  shape: Omit<Shape, 'kinds' | 'count' | 'objectCount'>;
  depth: number;
}

export function inferSchema(root: unknown): InferResult {
  const startedAt = performance.now();
  const shapes = new Map<string, Shape>();
  const stack: Frame[] = [
    { value: root, shape: { self: ROOT, parent: null, key: null, isItem: false }, depth: 0 },
  ];
  let isTruncated = false;

  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined) break;
    record(shapes, frame);
    if (frame.depth >= MAX_DEPTH || shapes.size >= MAX_SHAPES) {
      isTruncated = true;
      continue;
    }
    pushChildren(stack, frame);
  }

  return { schema: assemble(shapes), isTruncated, scanMs: performance.now() - startedAt };
}

function record(shapes: Map<string, Shape>, frame: Frame): void {
  const existing = shapes.get(frame.shape.self) ?? blankShape(frame);
  existing.kinds.add(kindOf(frame.value));
  existing.count += 1;
  if (isPlainRecord(frame.value)) existing.objectCount += 1;
  shapes.set(frame.shape.self, existing);
}

function blankShape(frame: Frame): Shape {
  return { ...frame.shape, kinds: new Set<JsonKind>(), count: 0, objectCount: 0 };
}

function pushChildren(stack: Frame[], frame: Frame): void {
  const depth = frame.depth + 1;
  const parent = frame.shape.self;

  if (isArrayValue(frame.value)) {
    const shape = { self: `${parent}${ITEM}`, parent, key: null, isItem: true };
    pushReversed(
      stack,
      frame.value.map((item) => ({ value: item, shape, depth })),
    );
    return;
  }

  if (!isPlainRecord(frame.value)) return;
  const entries = frame.value;
  pushReversed(
    stack,
    Object.keys(entries).map((key) => ({
      value: entries[key],
      shape: { self: `${parent}.${key}`, parent, key, isItem: false },
      depth,
    })),
  );
}

function assemble(shapes: Map<string, Shape>): JsonSchema {
  const children = groupByParent(shapes);
  const built = new Map<string, JsonSchema>();
  for (const shape of byDepthDescending(shapes)) {
    built.set(shape.self, schemaFor(shape, children.get(shape.self) ?? [], built));
  }
  return { $schema: SCHEMA_URL, ...(built.get(ROOT) ?? {}) };
}

function groupByParent(shapes: Map<string, Shape>): Map<string, Shape[]> {
  const grouped = new Map<string, Shape[]>();
  for (const shape of shapes.values()) {
    if (shape.parent === null) continue;
    const siblings = grouped.get(shape.parent) ?? [];
    siblings.push(shape);
    grouped.set(shape.parent, siblings);
  }
  return grouped;
}

function byDepthDescending(shapes: Map<string, Shape>): Shape[] {
  return [...shapes.values()].sort((left, right) => depthOf(right.self) - depthOf(left.self));
}

function depthOf(self: string): number {
  return self.split('.').length + self.split(ITEM).length;
}

function schemaFor(shape: Shape, children: readonly Shape[], built: Map<string, JsonSchema>): JsonSchema {
  const schema: JsonSchema = { type: typeOf(shape.kinds) };
  const item = children.find((child) => child.isItem);
  if (item !== undefined) schema['items'] = built.get(item.self) ?? {};

  const named = children.filter((child) => child.key !== null);
  if (named.length === 0) return schema;

  schema['properties'] = Object.fromEntries(
    named.map((child) => [child.key, built.get(child.self) ?? {}]),
  );
  const required = named.filter((child) => child.count === shape.objectCount).map((c) => c.key);
  if (required.length > 0) schema['required'] = required;
  return schema;
}

function typeOf(kinds: ReadonlySet<JsonKind>): string | string[] {
  const names = [...kinds].map(schemaType).sort();
  return names.length === 1 ? (names[0] ?? 'null') : names;
}

function schemaType(kind: JsonKind): string {
  if (kind === 'number') return 'number';
  return kind;
}
