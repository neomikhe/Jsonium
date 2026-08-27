import { childrenOf, positionOf } from './children';
import type { ChildEntry } from './children';
import { identityOf } from './identity';
import { segmentsOf } from './json-path';
import type { PathSegment } from './json-path';
import type { NodeId, NodeSummary } from './types';

export interface TrailStep {
  parentId: NodeId;
  offset: number;
  children: NodeSummary[];
  targetId: NodeId;
}

export interface TrailPage {
  offset: number;
  entries: ChildEntry[];
}

export type RegisterChild = (parentId: NodeId, entry: ChildEntry) => NodeSummary;

export interface TrailContext {
  rootId: NodeId;
  pageSize: number;
  registerChild: RegisterChild;
}

export function buildTrail(root: unknown, path: string, context: TrailContext): TrailStep[] | null {
  const segments = segmentsOf(path);
  if (segments === null) return null;

  const steps: TrailStep[] = [];
  let value = root;
  let parentId = context.rootId;

  for (const raw of segments) {
    const segment = settle(value, raw);
    if (segment === null) return null;
    const page = pageFor(value, segment, context.pageSize);
    if (page === null) return null;
    const children = page.entries.map((entry) => context.registerChild(parentId, entry));
    const target = pick(children, page.entries, segment);
    if (target === null) return null;
    steps.push({ parentId, offset: page.offset, children, targetId: target.id });
    parentId = target.id;
    value = target.value;
  }

  return steps;
}

function settle(value: unknown, segment: PathSegment): PathSegment | null {
  const match = segment.match;
  if (match === null) return segment;
  if (!Array.isArray(value)) return null;
  const at = value.findIndex((item, index) => identityOf(item, match.key, index) === match.identity);
  return at === -1 ? null : { key: null, index: at, match: null };
}

function pageFor(value: unknown, segment: PathSegment, pageSize: number): TrailPage | null {
  const at = positionOf(value, segment.key, segment.index);
  if (at === -1) return null;
  const offset = Math.floor(at / pageSize) * pageSize;
  return { offset, entries: childrenOf(value, offset, pageSize) };
}

interface Picked {
  id: NodeId;
  value: unknown;
}

function pick(
  children: readonly NodeSummary[],
  entries: readonly ChildEntry[],
  segment: PathSegment,
): Picked | null {
  const at = entries.findIndex((entry) =>
    segment.index === null ? entry.key === segment.key : entry.index === segment.index,
  );
  const summary = children[at];
  const entry = entries[at];
  if (at === -1 || summary === undefined || entry === undefined) return null;
  return { id: summary.id, value: entry.value };
}
