/** @vitest-environment jsdom */
import 'fake-indexeddb/auto';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ParseResult } from '../core/types';
import { clearDocuments, listDocuments } from './document-store';
import type { DocumentStatus } from './use-document';
import { useTabs } from './use-tabs';

const WAIT = { timeout: 4000 };

function parseResult(): ParseResult {
  return {
    root: { id: 0, key: null, index: null, kind: 'object', preview: '{ 1 }', childCount: 1 },
    parseMs: 1,
    bytes: 9,
  };
}

let nextRevision = 0;

function readyStatus(name: string, origin: 'file' | 'editor'): DocumentStatus {
  nextRevision += 1;
  return { state: 'ready', name, origin, revision: nextRevision, result: parseResult() };
}

describe('useTabs', () => {
  beforeEach(async () => {
    await clearDocuments();
  });

  afterEach(() => {
    cleanup();
  });

  it('abrir un archivo acuña un id y lo mantiene estable entre renders', async () => {
    const status = readyStatus('datos.json', 'file');
    const { result, rerender } = renderHook(({ text }) => useTabs(status, text), {
      initialProps: { text: '{"a":1}' },
    });

    await waitFor(() => {
      expect(result.current.activeId).not.toBeNull();
    }, WAIT);
    const minted = result.current.activeId;

    rerender({ text: '{"a":1}' });
    rerender({ text: '{"a":2}' });

    expect(result.current.activeId).toBe(minted);
  });

  it('persiste el documento con su nombre, una sola entrada', async () => {
    const status = readyStatus('datos.json', 'file');
    renderHook(() => useTabs(status, '{"a":1}'));

    await waitFor(async () => {
      const entries = await listDocuments();
      expect(entries).toHaveLength(1);
      expect(entries[0]?.name).toBe('datos.json');
    }, WAIT);
  });

  it('reabrir el mismo nombre reutiliza la pestaña en vez de duplicarla', async () => {
    const initial = readyStatus('datos.json', 'file');
    const first = renderHook(() => useTabs(initial, '{"a":1}'));
    await waitFor(async () => {
      expect(await listDocuments()).toHaveLength(1);
    }, WAIT);
    first.unmount();

    const second = readyStatus('datos.json', 'file');
    renderHook(() => useTabs(second, '{"a":2}'));

    await waitFor(async () => {
      expect(await listDocuments()).toHaveLength(1);
    }, WAIT);
  });

  it('un documento pegado tambien acuña un id', async () => {
    const status = readyStatus('pegado.json', 'editor');
    const { result } = renderHook(() => useTabs(status, '{"a":1}'));

    await waitFor(() => {
      expect(result.current.activeId).not.toBeNull();
    }, WAIT);
  });

  it('sin documento no acuña nada ni persiste', async () => {
    const empty: DocumentStatus = { state: 'empty' };
    const { result } = renderHook(() => useTabs(empty, ''));

    await waitFor(() => {
      expect(result.current.entries).toEqual([]);
    }, WAIT);
    expect(result.current.activeId).toBeNull();
    expect(await listDocuments()).toEqual([]);
  });
});
