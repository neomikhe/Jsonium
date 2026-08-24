import type { WorkerRequest, WorkerResponse } from '../core/protocol';
import type { DocumentStats, NodeId, NodeSummary, ParseResult } from '../core/types';
import ParseWorker from '../workers/parse.worker?worker';

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

export class DocumentClient {
  private readonly worker: Worker;
  private readonly pending = new Map<number, PendingCall>();
  private nextId = 0;

  constructor() {
    this.worker = new ParseWorker();
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      this.settle(event.data);
    };
  }

  parseFile(file: File): Promise<ParseResult> {
    return this.send<ParseResult>((id) => ({ id, type: 'parseFile', file }));
  }

  parseText(text: string): Promise<ParseResult> {
    return this.send<ParseResult>((id) => ({ id, type: 'parseText', text }));
  }

  children(nodeId: NodeId, offset: number, limit: number): Promise<NodeSummary[]> {
    return this.send<NodeSummary[]>((id) => ({ id, type: 'children', nodeId, offset, limit }));
  }

  stats(): Promise<DocumentStats> {
    return this.send<DocumentStats>((id) => ({ id, type: 'stats' }));
  }

  dispose(): void {
    this.worker.terminate();
    this.pending.clear();
  }

  private send<T>(build: (id: number) => WorkerRequest): Promise<T> {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      this.worker.postMessage(build(id));
    });
  }

  private settle(response: WorkerResponse): void {
    const call = this.pending.get(response.id);
    if (call === undefined) return;
    this.pending.delete(response.id);
    if (response.ok) call.resolve(response.result);
    else call.reject(new Error(response.error));
  }
}
