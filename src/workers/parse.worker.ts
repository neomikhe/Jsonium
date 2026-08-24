import { childrenOf } from '../core/children';
import { NodeRegistry } from '../core/node-registry';
import { isWorkerRequest } from '../core/protocol';
import type { WorkerRequest, WorkerResponse } from '../core/protocol';
import { messageOf } from '../core/error-message';
import { computeStats } from '../core/stats';
import { summarize } from '../core/summary';
import type { NodeSummary, ParseResult } from '../core/types';

interface WorkerScope {
  postMessage: (message: WorkerResponse) => void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
}

type ChildrenRequest = Extract<WorkerRequest, { type: 'children' }>;

// lib.dom no describe el scope de un worker: se acota a lo que realmente usamos
const scope = globalThis as unknown as WorkerScope;

const registry = new NodeRegistry();
let activeDocument: unknown = null;
let isLoaded = false;

function parseJson(text: string, sizeBytes: number): ParseResult {
  const startedAt = performance.now();
  activeDocument = JSON.parse(text);
  const parseMs = performance.now() - startedAt;
  isLoaded = true;
  registry.clear();
  const rootId = registry.register(activeDocument);
  return {
    root: summarize({ key: null, index: null, value: activeDocument }, rootId),
    parseMs,
    bytes: sizeBytes,
  };
}

function readChildren(request: ChildrenRequest): NodeSummary[] {
  if (!registry.has(request.nodeId)) throw new Error(`Nodo desconocido: ${request.nodeId}`);
  const parent = registry.read(request.nodeId);
  return childrenOf(parent, request.offset, request.limit).map((entry) =>
    summarize(entry, registry.register(entry.value)),
  );
}

function requireDocument(): unknown {
  if (!isLoaded) throw new Error('No hay documento cargado');
  return activeDocument;
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
