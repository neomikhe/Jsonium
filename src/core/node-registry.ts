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
  private nextId: NodeId = 0;

  register(node: RegisteredNode): NodeId {
    const id = this.nextId;
    this.nextId += 1;
    this.nodes.set(id, node);
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
    this.nextId = 0;
  }
}
