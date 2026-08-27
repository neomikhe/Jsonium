/** @vitest-environment jsdom */
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { useDocument } from './use-document';

class StubWorker {
  onmessage: unknown = null;
  onerror: unknown = null;
  onmessageerror: unknown = null;
  postMessage(): void {}
  terminate(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
}

beforeAll(() => {
  vi.stubGlobal('Worker', StubWorker);
});

describe('useDocument: ciclo de vida del cliente', () => {
  afterEach(() => {
    cleanup();
  });

  it('tras el doble montaje de StrictMode el cliente sigue siendo usable', async () => {
    const { result } = renderHook(() => useDocument(), { wrapper: StrictMode });

    await waitFor(() => {
      expect(result.current.client.isUsable).toBe(true);
    });
  });

  it('un cliente desechado deja de anunciarse como usable', async () => {
    const { result } = renderHook(() => useDocument(), { wrapper: StrictMode });
    await waitFor(() => {
      expect(result.current.client.isUsable).toBe(true);
    });

    result.current.client.dispose();

    expect(result.current.client.isUsable).toBe(false);
  });

  it('desmontar de verdad desecha el cliente vivo', async () => {
    const { result, unmount } = renderHook(() => useDocument(), { wrapper: StrictMode });
    await waitFor(() => {
      expect(result.current.client.isUsable).toBe(true);
    });
    const alive = result.current.client;

    unmount();

    expect(alive.isUsable).toBe(false);
  });

  it('sin StrictMode el cliente inicial es el que se usa', () => {
    const { result } = renderHook(() => useDocument());
    expect(result.current.client.isUsable).toBe(true);
  });
});
