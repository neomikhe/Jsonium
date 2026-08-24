import { isPlainRecord, kindOf } from './json-value';
import type { DocumentStats, JsonKind } from './types';

interface StackFrame {
  value: unknown;
  depth: number;
}

export function computeStats(root: unknown): DocumentStats {
  const startedAt = performance.now();
  const kinds = emptyKindCounters();
  const stack: StackFrame[] = [{ value: root, depth: 1 }];
  let nodes = 0;
  let maxDepth = 0;

  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined) break;
    nodes += 1;
    maxDepth = Math.max(maxDepth, frame.depth);
    kinds[kindOf(frame.value)] += 1;
    pushChildren(stack, frame);
  }

  return { nodes, maxDepth, kinds, scanMs: performance.now() - startedAt };
}

function emptyKindCounters(): Record<JsonKind, number> {
  return { object: 0, array: 0, string: 0, number: 0, boolean: 0, null: 0 };
}

function pushChildren(stack: StackFrame[], frame: StackFrame): void {
  const depth = frame.depth + 1;
  if (Array.isArray(frame.value)) {
    for (const item of frame.value) stack.push({ value: item, depth });
    return;
  }
  if (!isPlainRecord(frame.value)) return;
  for (const key of Object.keys(frame.value)) stack.push({ value: frame.value[key], depth });
}
