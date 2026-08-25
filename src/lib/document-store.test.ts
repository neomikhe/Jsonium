import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_TABS } from '../core/limits';
import type { StoredDocument } from './document-store';
import {
  clearDocuments,
  listDocuments,
  loadDocument,
  removeDocument,
  saveDocument,
} from './document-store';

function documentAt(id: string, savedAt: number): StoredDocument {
  return { id, name: `${id}.json`, text: `{"id":"${id}"}`, bytes: 13, savedAt };
}

describe('document-store', () => {
  beforeEach(async () => {
    await clearDocuments();
  });

  it('empieza vacio', async () => {
    expect(await listDocuments()).toEqual([]);
  });

  it('guarda y recupera un documento con su texto', async () => {
    await saveDocument(documentAt('uno', 1000));
    const loaded = await loadDocument('uno');

    expect(loaded?.name).toBe('uno.json');
    expect(loaded?.text).toBe('{"id":"uno"}');
    expect(loaded?.bytes).toBe(13);
  });

  it('devuelve null para un id desconocido', async () => {
    expect(await loadDocument('no-existe')).toBeNull();
  });

  it('no incluye el texto al listar', async () => {
    await saveDocument(documentAt('uno', 1000));
    const entries = await listDocuments();

    expect(entries).toHaveLength(1);
    expect(entries[0]).not.toHaveProperty('text');
  });

  it('ordena por fecha descendente', async () => {
    await saveDocument(documentAt('viejo', 1000));
    await saveDocument(documentAt('nuevo', 3000));
    await saveDocument(documentAt('medio', 2000));

    expect((await listDocuments()).map((entry) => entry.id)).toEqual(['nuevo', 'medio', 'viejo']);
  });

  it('sobrescribe el mismo id en lugar de duplicarlo', async () => {
    await saveDocument(documentAt('uno', 1000));
    await saveDocument({ ...documentAt('uno', 2000), text: '{"v":2}' });

    expect(await listDocuments()).toHaveLength(1);
    expect((await loadDocument('uno'))?.text).toBe('{"v":2}');
  });

  it('elimina metadatos y texto a la vez', async () => {
    await saveDocument(documentAt('uno', 1000));
    await removeDocument('uno');

    expect(await listDocuments()).toEqual([]);
    expect(await loadDocument('uno')).toBeNull();
  });

  it('conserva solo los MAX_TABS mas recientes', async () => {
    for (let index = 0; index < MAX_TABS + 3; index += 1) {
      await saveDocument(documentAt(`doc${index}`, index * 100));
    }

    const entries = await listDocuments();
    expect(entries).toHaveLength(MAX_TABS);
    expect(entries[0]?.id).toBe(`doc${MAX_TABS + 2}`);
    expect(await loadDocument('doc0')).toBeNull();
  });

  it('clearDocuments deja el almacen vacio', async () => {
    await saveDocument(documentAt('uno', 1000));
    await saveDocument(documentAt('dos', 2000));
    await clearDocuments();

    expect(await listDocuments()).toEqual([]);
    expect(await loadDocument('uno')).toBeNull();
  });
});
