import type { PathLink } from './json-path';
import { pathFrom } from './json-path';
import { kindOf, previewOf } from './json-value';
import { pushReversed } from './stack';
import { childFrames } from './walk';

export type SearchWhere = 'key' | 'value';

export interface SearchMatch {
  path: string;
  preview: string;
  where: SearchWhere;
}

export interface SearchOptions {
  query: string;
  limit: number;
}

export interface SearchResult {
  matches: SearchMatch[];
  isTruncated: boolean;
  scanMs: number;
}

interface Frame {
  value: unknown;
  link: PathLink | null;
}

export function search(root: unknown, options: SearchOptions): SearchResult {
  const startedAt = performance.now();
  const needle = options.query.trim().toLowerCase();
  if (needle === '') return { matches: [], isTruncated: false, scanMs: 0 };

  const matches: SearchMatch[] = [];
  const stack: Frame[] = [{ value: root, link: null }];

  while (stack.length > 0 && matches.length < options.limit) {
    const frame = stack.pop();
    if (frame === undefined) break;
    collectMatch(frame, needle, matches);
    pushChildren(stack, frame);
  }

  return {
    matches,
    isTruncated: matches.length >= options.limit,
    scanMs: performance.now() - startedAt,
  };
}

function collectMatch(frame: Frame, needle: string, matches: SearchMatch[]): void {
  const key = frame.link?.key ?? null;
  if (key !== null && key.toLowerCase().includes(needle)) {
    matches.push(matchOf(frame, 'key'));
    return;
  }
  if (!isScalar(frame.value)) return;
  if (!String(frame.value).toLowerCase().includes(needle)) return;
  matches.push(matchOf(frame, 'value'));
}

function matchOf(frame: Frame, where: SearchWhere): SearchMatch {
  return { path: pathFrom(frame.link), preview: previewOf(frame.value), where };
}

function isScalar(value: unknown): boolean {
  const kind = kindOf(value);
  return kind !== 'object' && kind !== 'array';
}

function pushChildren(stack: Frame[], frame: Frame): void {
  pushReversed(stack, childFrames(frame));
}
