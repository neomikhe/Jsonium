import { ROOT_PATH, segmentOf } from './json-path';
import type { NodeId } from './types';

export interface RegisteredNode {
  value: unknown;
  parentId: NodeId | null;
  key: string | null;
  index: number | null;
}

export class NodeRegistry {
  private readonly nodes = new Map<NodeId, RegisteredNode>();
  private readonly bySlot = new Map<string, NodeId>();
  private nextId: NodeId = 0;

  register(node: RegisteredNode): NodeId {
    const slot = slotOf(node);
    const known = slot === null ? undefined : this.bySlot.get(slot);
    if (known !== undefined) return known;

    const id = this.nextId;
    this.nextId += 1;
    this.nodes.set(id, node);
    if (slot !== null) this.bySlot.set(slot, id);
    return id;
  }

  read(id: NodeId): unknown {
    return this.nodes.get(id)?.value;
  }

  has(id: NodeId): boolean {
    return this.nodes.has(id);
  }

  pathOf(id: NodeId): string {
    const segments: string[] = [];
    let current = this.nodes.get(id);
    while (current !== undefined && current.parentId !== null) {
      segments.push(segmentOf(current.key, current.index));
      current = this.nodes.get(current.parentId);
    }
    return `${ROOT_PATH}${segments.toReversed().join('')}`;
  }

  clear(): void {
    this.nodes.clear();
    this.bySlot.clear();
    this.nextId = 0;
  }
}

function slotOf(node: RegisteredNode): string | null {
  if (node.parentId === null) return null;
  const own = node.index === null ? `k${node.key ?? ''}` : `i${node.index.toString()}`;
  return `${node.parentId.toString()}:${own}`;
}
