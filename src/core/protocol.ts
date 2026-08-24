import type { DocumentStats, NodeId, NodeSummary, ParseResult } from './types';

export type WorkerRequest =
  | { id: number; type: 'parseFile'; file: File }
  | { id: number; type: 'parseText'; text: string }
  | { id: number; type: 'children'; nodeId: NodeId; offset: number; limit: number }
  | { id: number; type: 'stats' };

export type RequestType = WorkerRequest['type'];

export type WorkerResponse =
  | { id: number; ok: true; type: 'parseFile' | 'parseText'; result: ParseResult }
  | { id: number; ok: true; type: 'children'; result: NodeSummary[] }
  | { id: number; ok: true; type: 'stats'; result: DocumentStats }
  | { id: number; ok: false; error: string };

const REQUEST_TYPES: ReadonlySet<string> = new Set<RequestType>([
  'parseFile',
  'parseText',
  'children',
  'stats',
]);

export function isWorkerRequest(value: unknown): value is WorkerRequest {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { id?: unknown; type?: unknown };
  return typeof candidate.id === 'number' && typeof candidate.type === 'string' && REQUEST_TYPES.has(candidate.type);
}
