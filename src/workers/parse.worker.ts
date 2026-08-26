import { childrenOf } from '../core/children';
import { generateTypes } from '../core/codegen';
import { analyzeConversion } from '../core/convert';
import type { ConvertOutput } from '../core/convert';
import { diff } from '../core/diff';
import { messageOf } from '../core/error-message';
import { inferSchema } from '../core/infer-schema';
import { queryPath } from '../core/jsonpath';
import { COPY_MAX_CHARS, EDITOR_MAX_BYTES, INDENT_SPACES } from '../core/limits';
import { NodeRegistry } from '../core/node-registry';
import { isWorkerRequest } from '../core/protocol';
import type { CompareResult, WorkerRequest, WorkerResponse } from '../core/protocol';
import { repair } from '../core/repair';
import { search } from '../core/search';
import { serialize } from '../core/serialize';
import { computeStats } from '../core/stats';
import { summarize } from '../core/summary';
import { validateSchema } from '../core/validate-schema';
import type { NodeId, NodeSummary, ParseResult } from '../core/types';

interface WorkerScope {
  postMessage: (message: WorkerResponse) => void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
}

interface Slot {
  value: unknown;
  bytes: number;
  isLoaded: boolean;
}

type ChildrenRequest = Extract<WorkerRequest, { type: 'children' }>;
type SerializeRequest = Extract<WorkerRequest, { type: 'serialize' }>;
type SearchRequest = Extract<WorkerRequest, { type: 'search' }>;
type DiffRequest = Extract<WorkerRequest, { type: 'diff' }>;
type ConvertRequest = Extract<WorkerRequest, { type: 'convert' }>;
type QueryRequest = Extract<WorkerRequest, { type: 'query' }>;
type ImportRequest = Extract<WorkerRequest, { type: 'importFile' }>;
type ValidateRequest = Extract<WorkerRequest, { type: 'validate' }>;
type CodegenRequest = Extract<WorkerRequest, { type: 'codegen' }>;

// lib.dom no describe el scope de un worker: se acota a lo que realmente usamos
const scope = globalThis as unknown as WorkerScope;

const registry = new NodeRegistry();
const main: Slot = { value: null, bytes: 0, isLoaded: false };
const compare: Slot = { value: null, bytes: 0, isLoaded: false };

function parseTimed(slot: Slot, text: string, sizeBytes: number): number {
  const startedAt = performance.now();
  const value: unknown = JSON.parse(text);
  const parseMs = performance.now() - startedAt;
  slot.value = value;
  slot.bytes = sizeBytes;
  slot.isLoaded = true;
  return parseMs;
}

function parseMain(text: string, sizeBytes: number): ParseResult {
  const parseMs = parseTimed(main, text, sizeBytes);
  return { ...adoptMain(main.value, sizeBytes), parseMs };
}

function adoptMain(value: unknown, sizeBytes: number): ParseResult {
  main.value = value;
  main.bytes = sizeBytes;
  main.isLoaded = true;
  registry.clear();
  const rootId = registry.register({ value, parentId: null, key: null, index: null });
  return { root: summarize({ key: null, index: null, value }, rootId), parseMs: 0, bytes: sizeBytes };
}

// js-yaml y smol-toml suman 68 kB: solo se cargan al convertir
async function runConvert(request: ConvertRequest): Promise<ConvertOutput> {
  const value = requireMain();
  const losses = analyzeConversion(value, request.format);
  const { toFormat } = await import('../core/convert-run');
  try {
    return { text: toFormat(value, request.format), losses, failure: null };
  } catch (cause) {
    return { text: '', losses, failure: messageOf(cause) };
  }
}

async function runImport(request: ImportRequest): Promise<ParseResult> {
  const text = await request.file.text();
  const { fromFormat } = await import('../core/convert-run');
  return adoptMain(fromFormat(text, request.format), request.file.size);
}

async function runValidate(request: ValidateRequest): Promise<ReturnType<typeof validateSchema>> {
  const document = requireMain();
  const schema: unknown = JSON.parse(await request.file.text());
  return validateSchema(document, schema, request.limit);
}

function runCodegen(request: CodegenRequest): string {
  return generateTypes(inferSchema(requireMain()).schema, request.language);
}

function parseCompare(text: string, sizeBytes: number): CompareResult {
  return { parseMs: parseTimed(compare, text, sizeBytes), bytes: sizeBytes };
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
  const document = requireMain();
  if (main.bytes > EDITOR_MAX_BYTES) {
    throw new Error('Documento demasiado grande para serializar en el editor');
  }
  return serialize(document, request.options);
}

function serializeNode(nodeId: NodeId): string {
  return serialize(requireNode(nodeId), {
    indent: INDENT_SPACES,
    sortKeys: false,
    maxLength: COPY_MAX_CHARS,
  });
}

function runQuery(request: QueryRequest): ReturnType<typeof queryPath> {
  return queryPath(requireMain(), request.expression, request.limit);
}

function runSearch(request: SearchRequest): ReturnType<typeof search> {
  return search(requireMain(), { query: request.query, limit: request.limit });
}

function runDiff(request: DiffRequest): ReturnType<typeof diff> {
  const left = requireMain();
  if (!compare.isLoaded) throw new Error('Falta el documento con el que comparar');
  return diff(left, compare.value, request.options);
}

function clearCompare(): null {
  compare.value = null;
  compare.bytes = 0;
  compare.isLoaded = false;
  return null;
}

function requireNode(nodeId: NodeId): unknown {
  if (!registry.has(nodeId)) throw new Error(`Nodo desconocido: ${nodeId.toString()}`);
  return registry.read(nodeId);
}

function requireMain(): unknown {
  if (!main.isLoaded) throw new Error('No hay documento cargado');
  return main.value;
}

// eslint-disable-next-line complexity -- despacho del protocolo: partirlo perderia la exhaustividad del switch
async function handleRequest(request: WorkerRequest): Promise<WorkerResponse> {
  const { id } = request;
  switch (request.type) {
    case 'parseFile': {
      const text = await request.file.text();
      return { id, ok: true, type: 'parseFile', result: parseMain(text, request.file.size) };
    }
    case 'parseText':
      return { id, ok: true, type: 'parseText', result: parseMain(request.text, request.text.length) };
    case 'compareFile': {
      const text = await request.file.text();
      return { id, ok: true, type: 'compareFile', result: parseCompare(text, request.file.size) };
    }
    case 'compareText':
      return {
        id,
        ok: true,
        type: 'compareText',
        result: parseCompare(request.text, request.text.length),
      };
    case 'clearCompare':
      return { id, ok: true, type: 'clearCompare', result: clearCompare() };
    case 'diff':
      return { id, ok: true, type: 'diff', result: runDiff(request) };
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
    case 'convert':
      return { id, ok: true, type: 'convert', result: await runConvert(request) };
    case 'importFile':
      return { id, ok: true, type: 'importFile', result: await runImport(request) };
    case 'query':
      return { id, ok: true, type: 'query', result: runQuery(request) };
    case 'inferSchema':
      return { id, ok: true, type: 'inferSchema', result: inferSchema(requireMain()) };
    case 'validate':
      return { id, ok: true, type: 'validate', result: await runValidate(request) };
    case 'codegen':
      return { id, ok: true, type: 'codegen', result: runCodegen(request) };
    case 'stats':
      return { id, ok: true, type: 'stats', result: computeStats(requireMain()) };
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
