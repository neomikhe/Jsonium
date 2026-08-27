import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkerRequest, WorkerResponse } from '../core/protocol';

type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;

type Ask = (request: WithoutId<WorkerRequest>) => Promise<WorkerResponse>;

interface TestScope {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
}

const scope = globalThis as unknown as TestScope;

async function bootWorker(): Promise<Ask> {
  const waiting = new Map<number, (response: WorkerResponse) => void>();
  vi.stubGlobal('postMessage', (response: WorkerResponse) => {
    waiting.get(response.id)?.(response);
    waiting.delete(response.id);
  });
  vi.resetModules();
  await import('./parse.worker');

  const handler = scope.onmessage;
  if (handler === null) throw new Error('el worker no se engancho al scope');

  let nextId = 0;
  return (request) =>
    new Promise((resolve) => {
      const id = nextId;
      nextId += 1;
      waiting.set(id, resolve);
      handler({ data: { ...request, id } } as MessageEvent<unknown>);
    });
}

function resultOf(response: WorkerResponse): unknown {
  if (!response.ok) throw new Error(`el worker fallo: ${response.error}`);
  return response.result;
}

function errorOf(response: WorkerResponse): string | null {
  return response.ok ? null : response.error;
}

const DOC = {
  meta: { version: 3 },
  users: [
    { id: 7, name: 'Ada', city: 'Madrid' },
    { id: 42, name: 'Grace', city: 'Bilbao' },
  ],
};

async function loadDoc(ask: Ask, value: unknown = DOC): Promise<number> {
  const parsed = resultOf(await ask({ type: 'parseText', text: JSON.stringify(value, null, 2) }));
  return (parsed as { root: { id: number } }).root.id;
}

async function childrenOfRoot(ask: Ask, rootId: number) {
  return resultOf(await ask({ type: 'children', nodeId: rootId, offset: 0, limit: 10 })) as {
    id: number;
    key: string;
  }[];
}

describe('worker: el ciclo completo de un documento', () => {
  let ask: Ask;

  beforeEach(async () => {
    ask = await bootWorker();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parsea y devuelve la raiz con su recuento de hijos', async () => {
    const parsed = resultOf(await ask({ type: 'parseText', text: JSON.stringify(DOC) }));
    expect(parsed).toMatchObject({ root: { kind: 'object', childCount: 2 } });
  });

  it('los hijos llegan con id, y esos ids sirven para pedir su ruta', async () => {
    const rootId = await loadDoc(ask);
    const children = await childrenOfRoot(ask, rootId);

    expect(children.map((child) => child.key)).toEqual(['meta', 'users']);

    const users = children[1];
    expect(resultOf(await ask({ type: 'path', nodeId: users?.id ?? -1 }))).toBe('$.users');
  });

  it('pedir la misma pagina dos veces devuelve los mismos ids', async () => {
    const rootId = await loadDoc(ask);
    const first = await childrenOfRoot(ask, rootId);
    const second = await childrenOfRoot(ask, rootId);

    expect(second.map((child) => child.id)).toEqual(first.map((child) => child.id));
  });

  it('el valor de un nodo vuelve serializado', async () => {
    const rootId = await loadDoc(ask);
    const children = await childrenOfRoot(ask, rootId);
    const meta = children.find((child) => child.key === 'meta');

    const value = resultOf(await ask({ type: 'value', nodeId: meta?.id ?? -1 }));
    expect(JSON.parse(value as string)).toEqual({ version: 3 });
  });

  it('las estadisticas cuentan el documento entero', async () => {
    await loadDoc(ask);
    const stats = resultOf(await ask({ type: 'stats' })) as { nodes: number; maxDepth: number };
    expect(stats.nodes).toBeGreaterThan(8);
    expect(stats.maxDepth).toBe(4);
  });

  it('cargar otro documento invalida los ids del anterior', async () => {
    const firstRoot = await loadDoc(ask);
    const before = await childrenOfRoot(ask, firstRoot);
    const staleId = before[1]?.id ?? -1;
    await loadDoc(ask, { otro: true, y: { mas: 1 } });

    expect(errorOf(await ask({ type: 'path', nodeId: staleId }))).toContain('node-unknown');
  });
});

describe('worker: las herramientas sobre el documento cargado', () => {
  let ask: Ask;

  beforeEach(async () => {
    ask = await bootWorker();
    await loadDoc(ask);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('busca por clave y por valor', async () => {
    const found = resultOf(await ask({ type: 'search', query: 'Bilbao', limit: 10 })) as {
      matches: { path: string }[];
    };
    expect(found.matches.map((match) => match.path)).toEqual(['$.users[1].city']);
  });

  it('consulta con JSONPath', async () => {
    const found = resultOf(
      await ask({ type: 'query', expression: '$.users[*].name', limit: 10 }),
    ) as { matches: { preview: string }[] };
    expect(found.matches).toHaveLength(2);
    expect(found.matches[1]?.preview).toContain('Grace');
  });

  it('serializa minificado igual que JSON.stringify', async () => {
    const minified = resultOf(
      await ask({ type: 'serialize', options: { indent: 0, sortKeys: false } }),
    );
    expect(minified).toBe(JSON.stringify(DOC));
  });

  it('infiere el esquema y genera tipos de ahi', async () => {
    const inferred = resultOf(await ask({ type: 'inferSchema' })) as { schema: { type: string } };
    expect(inferred.schema.type).toBe('object');

    const types = resultOf(await ask({ type: 'codegen', language: 'typescript' })) as string;
    expect(types).toContain('interface');
    expect(types).toContain('users');
  });

  it('convierte a YAML cargando la libreria de forma perezosa', async () => {
    const output = resultOf(await ask({ type: 'convert', format: 'yaml' })) as { text: string };
    expect(output.text).toContain('version: 3');
    expect(output.text).toContain('Grace');
  });

  it('avisa de la perdida al convertir a CSV una raiz que no es un array', async () => {
    const output = resultOf(await ask({ type: 'convert', format: 'csv' })) as {
      losses: { kind: string }[];
    };
    expect(output.losses.map((loss) => loss.kind)).toContain('csvRootNotRowArray');
  });

  it('genera mocks reproducibles', async () => {
    const first = resultOf(await ask({ type: 'mock', count: 2 }));
    const second = resultOf(await ask({ type: 'mock', count: 2 }));
    expect(second).toBe(first);
  });

  it('el rastro resuelve el token de emparejado del diff', async () => {
    const steps = resultOf(await ask({ type: 'trail', path: '$.users[id=42].city' })) as {
      targetId: number;
    }[];
    const target = steps.at(-1)?.targetId ?? -1;
    expect(resultOf(await ask({ type: 'path', nodeId: target }))).toBe('$.users[1].city');
  });

  it('el rastro de una ruta que no existe vuelve nulo, no roto', async () => {
    expect(resultOf(await ask({ type: 'trail', path: '$.users[99].city' }))).toBeNull();
  });
});

describe('worker: comparar y diferenciar', () => {
  let ask: Ask;

  beforeEach(async () => {
    ask = await bootWorker();
    await loadDoc(ask);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('empareja por clave y encuentra un solo cambio pese al reordenamiento', async () => {
    const reordered = {
      meta: { version: 3 },
      users: [
        { id: 42, name: 'Grace', city: 'Sevilla' },
        { id: 7, name: 'Ada', city: 'Madrid' },
      ],
    };
    resultOf(await ask({ type: 'compareText', text: JSON.stringify(reordered) }));

    const byIndex = resultOf(
      await ask({ type: 'diff', options: { arrayKey: null, limit: 50 } }),
    ) as { changes: unknown[] };
    const byKey = resultOf(await ask({ type: 'diff', options: { arrayKey: 'id', limit: 50 } })) as {
      changes: { path: string }[];
    };

    expect(byIndex.changes.length).toBeGreaterThan(1);
    expect(byKey.changes.map((change) => change.path)).toEqual(['$.users[id=42].city']);
  });

  it('quitar el documento de comparacion deja el diff sin base', async () => {
    resultOf(await ask({ type: 'compareText', text: JSON.stringify(DOC) }));
    resultOf(await ask({ type: 'clearCompare' }));

    const response = await ask({ type: 'diff', options: { arrayKey: null, limit: 50 } });
    expect(errorOf(response)).toBe('compare-missing');
  });

  it('sin documento con el que comparar, el diff falla con su codigo', async () => {
    const response = await ask({ type: 'diff', options: { arrayKey: null, limit: 50 } });
    expect(errorOf(response)).toBe('compare-missing');
  });
});

describe('worker: lo que rechaza', () => {
  let ask: Ask;

  beforeEach(async () => {
    ask = await bootWorker();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sin documento cargado responde con un codigo, no con prosa', async () => {
    expect(errorOf(await ask({ type: 'stats' }))).toBe('document-missing');
  });

  it('un nodo desconocido se rechaza con su detalle', async () => {
    await loadDoc(ask);
    expect(errorOf(await ask({ type: 'path', nodeId: 9999 }))).toBe('node-unknown:9999');
  });

  it('una consulta mal formada devuelve el codigo del fallo', async () => {
    await loadDoc(ask);
    expect(errorOf(await ask({ type: 'query', expression: 'users', limit: 10 }))).toBe(
      'query-root',
    );
  });

  it('un JSON invalido no tumba el worker', async () => {
    expect(errorOf(await ask({ type: 'parseText', text: '{"a":,}' }))).not.toBeNull();

    const good = resultOf(await ask({ type: 'parseText', text: '{"a":1}' }));
    expect(good).toMatchObject({ root: { childCount: 1 } });
  });

  it('un mensaje que no es del protocolo se descarta en silencio', async () => {
    const rootId = await loadDoc(ask);
    scope.onmessage?.({ data: { id: 99, type: 'formatearElDisco' } } as MessageEvent<unknown>);

    const children = resultOf(await ask({ type: 'children', nodeId: rootId, offset: 0, limit: 1 }));
    expect(children).toHaveLength(1);
  });

  it('__proto__ del documento se trata como una clave normal', async () => {
    const rootId = await loadDoc(ask, JSON.parse('{"__proto__":{"x":1},"ok":true}'));
    const children = await childrenOfRoot(ask, rootId);

    expect(children.map((child) => child.key)).toContain('__proto__');
    expect(Object.prototype).not.toHaveProperty('x');
  });
});
