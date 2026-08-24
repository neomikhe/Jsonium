import type { NodeId } from './types';

export class NodeRegistry {
  private readonly values = new Map<NodeId, unknown>();
  private nextId: NodeId = 0;

  register(value: unknown): NodeId {
    const id = this.nextId;
    this.nextId += 1;
    this.values.set(id, value);
    return id;
  }

  read(id: NodeId): unknown {
    return this.values.get(id);
  }

  has(id: NodeId): boolean {
    return this.values.has(id);
  }

  clear(): void {
    this.values.clear();
    this.nextId = 0;
  }
}
