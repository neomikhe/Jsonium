import type { Language } from './codegen';
import type { ConvertFormat, ConvertOutput } from './convert';
import type { DiffOptions, DiffResult } from './diff';
import type { InferResult } from './infer-schema';
import type { QueryResult } from './jsonpath';
import type { ValidationResult } from './validate-schema';
import type { RepairResult } from './repair';
import type { SearchResult } from './search';
import type { SerializeOptions } from './serialize';
import type { TrailStep } from './trail';
import type { DocumentStats, NodeId, NodeSummary, ParseResult } from './types';

export type WorkerRequest =
  | { id: number; type: 'parseFile'; file: File }
  | { id: number; type: 'parseText'; text: string }
  | { id: number; type: 'children'; nodeId: NodeId; offset: number; limit: number }
  | { id: number; type: 'trail'; path: string }
  | { id: number; type: 'serialize'; options: SerializeOptions }
  | { id: number; type: 'repair'; text: string }
  | { id: number; type: 'path'; nodeId: NodeId }
  | { id: number; type: 'value'; nodeId: NodeId }
  | { id: number; type: 'search'; query: string; limit: number }
  | { id: number; type: 'compareFile'; file: File }
  | { id: number; type: 'compareText'; text: string }
  | { id: number; type: 'clearCompare' }
  | { id: number; type: 'diff'; options: DiffOptions }
  | { id: number; type: 'convert'; format: ConvertFormat }
  | { id: number; type: 'importFile'; file: File; format: ConvertFormat }
  | { id: number; type: 'query'; expression: string; limit: number }
  | { id: number; type: 'inferSchema' }
  | { id: number; type: 'validate'; file: File; limit: number }
  | { id: number; type: 'codegen'; language: Language }
  | { id: number; type: 'mock'; count: number }
  | { id: number; type: 'stats' };

export interface CompareResult {
  parseMs: number;
  bytes: number;
}

export type RequestType = WorkerRequest['type'];

export type WorkerResponse =
  | { id: number; ok: true; type: 'parseFile' | 'parseText'; result: ParseResult }
  | { id: number; ok: true; type: 'children'; result: NodeSummary[] }
  | { id: number; ok: true; type: 'trail'; result: TrailStep[] | null }
  | { id: number; ok: true; type: 'serialize' | 'path' | 'value'; result: string }
  | { id: number; ok: true; type: 'repair'; result: RepairResult }
  | { id: number; ok: true; type: 'search'; result: SearchResult }
  | { id: number; ok: true; type: 'compareFile' | 'compareText'; result: CompareResult }
  | { id: number; ok: true; type: 'clearCompare'; result: null }
  | { id: number; ok: true; type: 'diff'; result: DiffResult }
  | { id: number; ok: true; type: 'convert'; result: ConvertOutput }
  | { id: number; ok: true; type: 'importFile'; result: ParseResult }
  | { id: number; ok: true; type: 'query'; result: QueryResult }
  | { id: number; ok: true; type: 'inferSchema'; result: InferResult }
  | { id: number; ok: true; type: 'validate'; result: ValidationResult }
  | { id: number; ok: true; type: 'codegen'; result: string }
  | { id: number; ok: true; type: 'mock'; result: string }
  | { id: number; ok: true; type: 'stats'; result: DocumentStats }
  | { id: number; ok: false; error: string };

const REQUEST_TYPES: ReadonlySet<string> = new Set<RequestType>([
  'parseFile',
  'parseText',
  'children',
  'trail',
  'serialize',
  'repair',
  'path',
  'value',
  'search',
  'compareFile',
  'compareText',
  'clearCompare',
  'diff',
  'convert',
  'importFile',
  'query',
  'inferSchema',
  'validate',
  'codegen',
  'mock',
  'stats',
]);

export function isWorkerRequest(value: unknown): value is WorkerRequest {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { id?: unknown; type?: unknown };
  return (
    typeof candidate.id === 'number' &&
    typeof candidate.type === 'string' &&
    REQUEST_TYPES.has(candidate.type)
  );
}
