import { childrenOf } from '../core/children';
import { messageOf } from '../core/error-message';
import { COPY_MAX_CHARS, EDITOR_MAX_BYTES, INDENT_SPACES } from '../core/limits';
import { NodeRegistry } from '../core/node-registry';
import { isWorkerRequest } from '../core/protocol';
import type { WorkerRequest, WorkerResponse } from '../core/protocol';
import { repair } from '../core/repair';
import { search } from '../core/search';
import { serialize } from '../core/serialize';
import { computeStats } from '../core/stats';
import { summarize } from '../core/summary';
import type { NodeId, NodeSummary, ParseResult } from '../core/types';

interface WorkerScope {
  postMessage: (message: WorkerResponse) => void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
}

type ChildrenRequest = Extract<WorkerRequest, { type: 'children' }>;
type SerializeRequest = Extract<WorkerRequest, { type: 'serialize' }>;
type SearchRequest = Extract<WorkerRequest, { type: 'search' }>;

// lib.dom no describe el scope de un worker: se acota a lo que realmente usamos
const scope = globalThis as unknown as WorkerScope;

const registry = new NodeRegistry();
let activeDocument: unknown = null;
let documentBytes = 0;
let isLoaded = false;

function parseJson(text: string, sizeBytes: number): ParseResult {
  const startedAt = performance.now();
  activeDocument = JSON.parse(text);
  const parseMs = performance.now() - startedAt;
  isLoaded = true;
  documentBytes = sizeBytes;
  registry.clear();
  const rootId = registry.register({
    value: activeDocument,
    parentId: null,
    key: null,
    index: null,
  });
  return {
    root: summarize({ key: null, index: null, value: activeDocument }, rootId),
    parseMs,
    bytes: sizeBytes,
  };
}

function readChildren(request: ChildrenRequest): NodeSummary[] {
  const parent = requireNode(request.nodeId);
  return childrenOf(parent, request.offset, request.limit).map((entry) =>
    summarize(
      entry,
      registry.register({
        value: entry.value,
        parentId: request.nodeId,
        key: entry.key,
        index: entry.index,
      }),
    ),
  );
}

function serializeDocument(request: SerializeRequest): string {
  const document = requireDocument();
  if (documentBytes > EDITOR_MAX_BYTES) {
    throw new Error('Documento demasiado grande para serializar en el editor');
  }
  return serialize(document, request.options);
}

function serializeNode(nodeId: NodeId): string {
  const value = requireNode(nodeId);
  return serialize(value, {
    indent: INDENT_SPACES,
    sortKeys: false,
    maxLength: COPY_MAX_CHARS,
  });
}

function requireNode(nodeId: NodeId): unknown {
  if (!registry.has(nodeId)) throw new Error(`Nodo desconocido: ${nodeId.toString()}`);
  return registry.read(nodeId);
}

function requireDocument(): unknown {
  if (!isLoaded) throw new Error('No hay documento cargado');
  return activeDocument;
}

function runSearch(request: SearchRequest): ReturnType<typeof search> {
  return search(requireDocument(), { query: request.query, limit: request.limit });
}

async function handleRequest(request: WorkerRequest): Promise<WorkerResponse> {
  const { id } = request;
  switch (request.type) {
    case 'parseFile': {
      const text = await request.file.text();
      return { id, ok: true, type: 'parseFile', result: parseJson(text, request.file.size) };
    }
    case 'parseText':
      return {
        id,
        ok: true,
        type: 'parseText',
        result: parseJson(request.text, request.text.length),
      };
    case 'children':
      return { id, ok: true, type: 'children', result: readChildren(request) };
    case 'serialize':
      return { id, ok: true, type: 'serialize', result: serializeDocument(request) };
    case 'repair':
      return { id, ok: true, type: 'repair', result: repair(request.text) };
    case 'path':
      return { id, ok: true, type: 'path', result: registry.pathOf(request.nodeId) };
    case 'value':
      return { id, ok: true, type: 'value', result: serializeNode(request.nodeId) };
    case 'search':
      return { id, ok: true, type: 'search', result: runSearch(request) };
    case 'stats':
      return { id, ok: true, type: 'stats', result: computeStats(requireDocument()) };
  }
}

scope.onmessage = (event: MessageEvent<unknown>) => {
  const request: unknown = event.data;
  if (!isWorkerRequest(request)) return;
  handleRequest(request)
    .then((response) => {
      scope.postMessage(response);
    })
    .catch((error: unknown) => {
      scope.postMessage({ id: request.id, ok: false, error: messageOf(error) });
    });
};
