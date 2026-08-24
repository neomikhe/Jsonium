import type { ChildEntry } from './children';
import { countChildren, kindOf, previewOf } from './json-value';
import type { NodeId, NodeSummary } from './types';

export function summarize(entry: ChildEntry, id: NodeId): NodeSummary {
  return {
    id,
    key: entry.key,
    index: entry.index,
    kind: kindOf(entry.value),
    preview: previewOf(entry.value),
    childCount: countChildren(entry.value),
  };
}
