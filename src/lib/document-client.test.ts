import { describe, expect, it, vi } from 'vitest';
import { DocumentClient } from './document-client';
import type { WorkerLike } from './document-client';
import type { WorkerRequest, WorkerResponse } from '../core/protocol';
import { isCancelled } from '../core/failure';
import type { DocumentStats } from '../core/types';

const STATS: DocumentStats = {
  nodes: 3,
  maxDepth: 1,
  scanMs: 0,
  kinds: { object: 1, array: 0, string: 2, number: 0, boolean: 0, null: 0 },
};

class FakeWorker implements WorkerLike {
  readonly sent: WorkerRequest[] = [];
  isTerminated = false;
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onmessageerror: ((event: unknown) => void) | null = null;

  postMessage(message: WorkerRequest): void {
    this.sent.push(message);
  }

  terminate(): void {
    this.isTerminated = true;
  }

  reply(response: WorkerResponse): void {
    this.onmessage?.({ data: response } as MessageEvent<WorkerResponse>);
  }

  crash(): void {
    this.onerror?.(new Error('el worker murio'));
  }
}

function clientWith(): { client: DocumentClient; worker: FakeWorker } {
  const worker = new FakeWorker();
  return { client: new DocumentClient(() => worker), worker };
}

describe('DocumentClient: camino feliz', () => {
  it('correlaciona la respuesta con su peticion por id', async () => {
    const { client, worker } = clientWith();
    const first = client.stats();
    const second = client.path(7);

    worker.reply({ id: 1, ok: true, type: 'path', result: '$.a' });
    worker.reply({ id: 0, ok: true, type: 'stats', result: STATS });

    await expect(second).resolves.toBe('$.a');
    await expect(first).resolves.toEqual(STATS);
  });

  it('una respuesta de error rechaza con su mensaje', async () => {
    const { client, worker } = clientWith();
    const pending = client.stats();
    worker.reply({ id: 0, ok: false, error: 'document-missing' });

    await expect(pending).rejects.toThrow('document-missing');
  });

  it('una respuesta sin peticion viva no rompe nada', () => {
    const { client, worker } = clientWith();
    expect(() => {
      worker.reply({ id: 99, ok: true, type: 'clearCompare', result: null });
    }).not.toThrow();
    expect(client).toBeDefined();
  });
});

describe('DocumentClient: el worker muere', () => {
  it('rechaza todo lo pendiente en vez de dejarlo colgado', async () => {
    const { client, worker } = clientWith();
    const first = client.stats();
    const second = client.search('a', 10);

    worker.crash();

    await expect(first).rejects.toThrow('worker-crashed');
    await expect(second).rejects.toThrow('worker-crashed');
  });

  it('las llamadas posteriores al fallo rechazan de inmediato', async () => {
    const { client, worker } = clientWith();
    worker.crash();

    await expect(client.stats()).rejects.toThrow('worker-crashed');
  });

  it('una respuesta ilegible tambien rechaza lo pendiente', async () => {
    const { client, worker } = clientWith();
    const pending = client.stats();

    worker.onmessageerror?.(new Error('no se pudo clonar'));

    await expect(pending).rejects.toThrow('worker-crashed');
  });
});

describe('DocumentClient: dispose', () => {
  it('rechaza lo pendiente en vez de descartarlo en silencio', async () => {
    const { client, worker } = clientWith();
    const pending = client.stats();

    client.dispose();

    expect(worker.isTerminated).toBe(true);
    await expect(pending).rejects.toThrow('client-disposed');
  });

  it('llamar despues de dispose rechaza sin enviar nada al worker', async () => {
    const { client, worker } = clientWith();
    client.dispose();
    const sentBefore = worker.sent.length;

    await expect(client.stats()).rejects.toThrow('client-disposed');
    expect(worker.sent).toHaveLength(sentBefore);
  });

  it('dispose dos veces no lanza', () => {
    const { client } = clientWith();
    client.dispose();
    expect(() => {
      client.dispose();
    }).not.toThrow();
  });

  it('una respuesta tardia tras dispose se ignora', async () => {
    const { client, worker } = clientWith();
    const pending = client.stats();
    client.dispose();
    await expect(pending).rejects.toThrow('client-disposed');

    const late = vi.fn();
    pending.catch(late);
    expect(() => {
      worker.reply({ id: 0, ok: true, type: 'stats', result: STATS });
    }).not.toThrow();
  });
});

describe('cancelacion', () => {
  it('el cierre del cliente se reconoce como cancelacion, no como fallo', async () => {
    const { client } = clientWith();
    const pending = client.stats();
    client.dispose();

    await expect(pending).rejects.toSatisfy(isCancelled);
  });

  it('la muerte del worker no es una cancelacion: es un fallo que se muestra', async () => {
    const { client, worker } = clientWith();
    const pending = client.stats();
    worker.crash();

    await expect(pending).rejects.not.toSatisfy(isCancelled);
  });

  it('un error corriente del worker tampoco es cancelacion', async () => {
    const { client, worker } = clientWith();
    const pending = client.stats();
    worker.reply({ id: 0, ok: false, error: 'document-missing' });

    await expect(pending).rejects.not.toSatisfy(isCancelled);
  });
});

describe('concretePath', () => {
  it('convierte una ruta con token en la ruta concreta del nodo', async () => {
    const { client, worker } = clientWith();
    const pending = client.concretePath('$.users[id=42]');

    worker.reply({
      id: 0,
      ok: true,
      type: 'trail',
      result: [{ parentId: 0, offset: 0, children: [], targetId: 9 }],
    });
    await Promise.resolve();
    worker.reply({ id: 1, ok: true, type: 'path', result: '$.users[1]' });

    await expect(pending).resolves.toBe('$.users[1]');
    expect(worker.sent[1]).toEqual({ id: 1, type: 'path', nodeId: 9 });
  });

  it('una ruta que el worker no resuelve no pide la ruta concreta', async () => {
    const { client, worker } = clientWith();
    const pending = client.concretePath('$.users[id=999]');

    worker.reply({ id: 0, ok: true, type: 'trail', result: null });

    await expect(pending).resolves.toBeNull();
    expect(worker.sent).toHaveLength(1);
  });

  it('la raiz no tiene ultimo paso y no se resuelve', async () => {
    const { client, worker } = clientWith();
    const pending = client.concretePath('$');

    worker.reply({ id: 0, ok: true, type: 'trail', result: [] });

    await expect(pending).resolves.toBeNull();
    expect(worker.sent).toHaveLength(1);
  });
});
