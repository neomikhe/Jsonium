import { ROOT_PATH, pathFrom } from './json-path';
import { DocumentFailure } from './failure';
import { kindOf, previewOf } from './json-value';
import { pushReversed } from './stack';
import type { WalkFrame } from './walk';
import { childFrames } from './walk';
import type { JsonKind } from './types';

export interface QueryMatch {
  path: string;
  kind: JsonKind;
  preview: string;
}

export interface QueryResult {
  matches: QueryMatch[];
  isTruncated: boolean;
  scanMs: number;
}

type Segment =
  | { kind: 'key'; name: string }
  | { kind: 'index'; at: number }
  | { kind: 'wildcard' }
  | { kind: 'slice'; from: number | null; to: number | null }
  | { kind: 'descend'; name: string };

const QUOTES = new Set(["'", '"']);

export function queryPath(root: unknown, expression: string, limit: number): QueryResult {
  const startedAt = performance.now();
  const segments = parseSegments(expression);
  let frames: WalkFrame[] = [{ value: root, link: null }];

  for (const segment of segments) {
    frames = expand(frames, segment, limit);
  }

  return {
    matches: frames.slice(0, limit).map(toMatch),
    isTruncated: frames.length > limit,
    scanMs: performance.now() - startedAt,
  };
}

function expand(frames: readonly WalkFrame[], segment: Segment, limit: number): WalkFrame[] {
  const next: WalkFrame[] = [];
  for (const frame of frames) {
    if (next.length > limit) break;
    next.push(...applySegment(frame, segment));
  }
  return next;
}

function applySegment(frame: WalkFrame, segment: Segment): WalkFrame[] {
  const children = childFrames(frame);
  if (segment.kind === 'wildcard') return children;
  if (segment.kind === 'key') return children.filter((child) => keyOf(child) === segment.name);
  if (segment.kind === 'index') return atIndex(children, segment.at);
  if (segment.kind === 'slice')
    return children.slice(sliceStart(segment, children.length), sliceEnd(segment, children.length));
  return descend(frame, segment.name);
}

function atIndex(children: readonly WalkFrame[], at: number): WalkFrame[] {
  const position = at < 0 ? children.length + at : at;
  const child = children[position];
  return child === undefined ? [] : [child];
}

function sliceStart(segment: Extract<Segment, { kind: 'slice' }>, total: number): number {
  if (segment.from === null) return 0;
  return segment.from < 0 ? total + segment.from : segment.from;
}

function sliceEnd(segment: Extract<Segment, { kind: 'slice' }>, total: number): number {
  if (segment.to === null) return total;
  return segment.to < 0 ? total + segment.to : segment.to;
}

function descend(frame: WalkFrame, name: string): WalkFrame[] {
  const found: WalkFrame[] = [];
  const stack: WalkFrame[] = [frame];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    if (current !== frame && keyOf(current) === name) found.push(current);
    pushReversed(stack, childFrames(current));
  }
  return found;
}

function keyOf(frame: WalkFrame): string | null {
  return frame.link?.key ?? null;
}

function toMatch(frame: WalkFrame): QueryMatch {
  return {
    path: pathFrom(frame.link),
    kind: kindOf(frame.value),
    preview: previewOf(frame.value),
  };
}

function parseSegments(expression: string): Segment[] {
  const source = expression.trim();
  if (source === '') throw new DocumentFailure('query-empty');
  if (!source.startsWith(ROOT_PATH)) throw new DocumentFailure('query-root');

  const segments: Segment[] = [];
  let index = ROOT_PATH.length;
  while (index < source.length) {
    index = readSegment(source, index, segments);
  }
  return segments;
}

function readSegment(source: string, start: number, segments: Segment[]): number {
  const char = source[start] ?? '';
  if (char === '[') return readBracket(source, start, segments);
  if (char !== '.') throw new DocumentFailure('query-separator', start.toString());
  if (source[start + 1] === '.') return readDescend(source, start + 2, segments);
  return readDotted(source, start + 1, segments);
}

function readDotted(source: string, start: number, segments: Segment[]): number {
  if (source[start] === '*') {
    segments.push({ kind: 'wildcard' });
    return start + 1;
  }
  const end = readName(source, start);
  if (end === start) throw new DocumentFailure('query-name-dot');
  segments.push({ kind: 'key', name: source.slice(start, end) });
  return end;
}

function readDescend(source: string, start: number, segments: Segment[]): number {
  const end = readName(source, start);
  if (end === start) throw new DocumentFailure('query-name-descend');
  segments.push({ kind: 'descend', name: source.slice(start, end) });
  return end;
}

function readBracket(source: string, start: number, segments: Segment[]): number {
  const close = source.indexOf(']', start);
  if (close === -1) throw new DocumentFailure('query-bracket');
  const inner = source.slice(start + 1, close).trim();
  segments.push(parseBracket(inner));
  return close + 1;
}

function parseBracket(inner: string): Segment {
  if (inner === '*') return { kind: 'wildcard' };
  if (QUOTES.has(inner[0] ?? '')) return { kind: 'key', name: inner.slice(1, -1) };
  if (inner.includes(':')) return parseSlice(inner);
  const at = Number(inner);
  if (!Number.isInteger(at)) throw new DocumentFailure('query-index', inner);
  return { kind: 'index', at };
}

function parseSlice(inner: string): Segment {
  const [from, to] = inner.split(':');
  return { kind: 'slice', from: toBound(from), to: toBound(to) };
}

function toBound(text: string | undefined): number | null {
  const trimmed = text?.trim() ?? '';
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value)) throw new DocumentFailure('query-bound', trimmed);
  return value;
}

function readName(source: string, start: number): number {
  let end = start;
  while (end < source.length && isNameChar(source[end] ?? '')) end += 1;
  return end;
}

function isNameChar(char: string): boolean {
  return /[A-Za-z0-9_$-]/.test(char);
}
