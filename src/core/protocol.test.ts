import { describe, expect, it } from 'vitest';
import { isWorkerRequest } from './protocol';

describe('isWorkerRequest', () => {
  it('acepta mensajes conocidos', () => {
    expect(isWorkerRequest({ id: 1, type: 'stats' })).toBe(true);
    expect(isWorkerRequest({ id: 0, type: 'children', nodeId: 3, offset: 0, limit: 10 })).toBe(true);
  });

  it('rechaza tipos desconocidos', () => {
    expect(isWorkerRequest({ id: 1, type: 'evalCode' })).toBe(false);
    expect(isWorkerRequest({ id: 1, type: 'constructor' })).toBe(false);
    expect(isWorkerRequest({ id: 1, type: '__proto__' })).toBe(false);
  });

  it('rechaza formas invalidas', () => {
    expect(isWorkerRequest(null)).toBe(false);
    expect(isWorkerRequest('stats')).toBe(false);
    expect(isWorkerRequest({ type: 'stats' })).toBe(false);
    expect(isWorkerRequest({ id: '1', type: 'stats' })).toBe(false);
  });
});
