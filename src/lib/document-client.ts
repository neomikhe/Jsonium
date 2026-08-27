import type { Language } from '../core/codegen';
import type { ConvertFormat, ConvertOutput } from '../core/convert';
import type { DiffOptions, DiffResult } from '../core/diff';
import type { InferResult } from '../core/infer-schema';
import type { QueryResult } from '../core/jsonpath';
import type { ValidationResult } from '../core/validate-schema';
import { DocumentFailure } from '../core/failure';
import type { FailureCode } from '../core/failure';
import type { CompareResult, WorkerRequest, WorkerResponse } from '../core/protocol';
import type { RepairResult } from '../core/repair';
import type { SearchResult } from '../core/search';
import type { SerializeOptions } from '../core/serialize';
import type { TrailStep } from '../core/trail';
import type { DocumentStats, NodeId, NodeSummary, ParseResult } from '../core/types';
import ParseWorker from '../workers/parse.worker?worker';

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

export interface WorkerLike {
  postMessage: (message: WorkerRequest) => void;
  terminate: () => void;
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessageerror: ((event: unknown) => void) | null;
}

export class DocumentClient {
  private readonly worker: WorkerLike;
  private readonly pending = new Map<number, PendingCall>();
  private nextId = 0;
  private failure: FailureCode | null = null;

  constructor(spawn: () => WorkerLike = () => new ParseWorker() as unknown as WorkerLike) {
    this.worker = spawn();
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      this.settle(event.data);
    };
    this.worker.onerror = () => {
      this.fail('worker-crashed');
    };
    this.worker.onmessageerror = () => {
      this.fail('worker-crashed');
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

  trail(path: string): Promise<TrailStep[] | null> {
    return this.send<TrailStep[] | null>((id) => ({ id, type: 'trail', path }));
  }

  async concretePath(path: string): Promise<string | null> {
    const steps = await this.trail(path);
    const target = steps?.at(-1)?.targetId;
    return target === undefined ? null : this.path(target);
  }

  serialize(options: SerializeOptions): Promise<string> {
    return this.send<string>((id) => ({ id, type: 'serialize', options }));
  }

  repair(text: string): Promise<RepairResult> {
    return this.send<RepairResult>((id) => ({ id, type: 'repair', text }));
  }

  path(nodeId: NodeId): Promise<string> {
    return this.send<string>((id) => ({ id, type: 'path', nodeId }));
  }

  value(nodeId: NodeId): Promise<string> {
    return this.send<string>((id) => ({ id, type: 'value', nodeId }));
  }

  search(query: string, limit: number): Promise<SearchResult> {
    return this.send<SearchResult>((id) => ({ id, type: 'search', query, limit }));
  }

  compareFile(file: File): Promise<CompareResult> {
    return this.send<CompareResult>((id) => ({ id, type: 'compareFile', file }));
  }

  compareText(text: string): Promise<CompareResult> {
    return this.send<CompareResult>((id) => ({ id, type: 'compareText', text }));
  }

  clearCompare(): Promise<null> {
    return this.send<null>((id) => ({ id, type: 'clearCompare' }));
  }

  diff(options: DiffOptions): Promise<DiffResult> {
    return this.send<DiffResult>((id) => ({ id, type: 'diff', options }));
  }

  convert(format: ConvertFormat): Promise<ConvertOutput> {
    return this.send<ConvertOutput>((id) => ({ id, type: 'convert', format }));
  }

  importFile(file: File, format: ConvertFormat): Promise<ParseResult> {
    return this.send<ParseResult>((id) => ({ id, type: 'importFile', file, format }));
  }

  query(expression: string, limit: number): Promise<QueryResult> {
    return this.send<QueryResult>((id) => ({ id, type: 'query', expression, limit }));
  }

  inferSchema(): Promise<InferResult> {
    return this.send<InferResult>((id) => ({ id, type: 'inferSchema' }));
  }

  validate(file: File, limit: number): Promise<ValidationResult> {
    return this.send<ValidationResult>((id) => ({ id, type: 'validate', file, limit }));
  }

  codegen(language: Language): Promise<string> {
    return this.send<string>((id) => ({ id, type: 'codegen', language }));
  }

  mock(count: number): Promise<string> {
    return this.send<string>((id) => ({ id, type: 'mock', count }));
  }

  stats(): Promise<DocumentStats> {
    return this.send<DocumentStats>((id) => ({ id, type: 'stats' }));
  }

  get isUsable(): boolean {
    return this.failure === null;
  }

  dispose(): void {
    this.fail('client-disposed');
  }

  private fail(cause: FailureCode): void {
    this.failure ??= cause;
    this.worker.terminate();
    const abandoned = [...this.pending.values()];
    this.pending.clear();
    for (const call of abandoned) call.reject(new DocumentFailure(this.failure));
  }

  private send<T>(build: (id: number) => WorkerRequest): Promise<T> {
    if (this.failure !== null) return Promise.reject(new DocumentFailure(this.failure));
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
