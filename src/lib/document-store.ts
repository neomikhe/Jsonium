import { MAX_TABS } from '../core/limits';

const DB_NAME = 'jsonium';
const DB_VERSION = 1;
const ENTRIES = 'entries';
const TEXTS = 'texts';

export interface DocumentEntry {
  id: string;
  name: string;
  bytes: number;
  savedAt: number;
}

export interface StoredDocument extends DocumentEntry {
  text: string;
}

export async function listDocuments(): Promise<DocumentEntry[]> {
  const database = await openDatabase();
  const store = transactionFor(database, ENTRIES, 'readonly');
  const entries = await requestOf(store.getAll() as IDBRequest<DocumentEntry[]>);
  database.close();
  return entries.sort((left, right) => right.savedAt - left.savedAt);
}

export async function saveDocument(document: StoredDocument): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction([ENTRIES, TEXTS], 'readwrite');
  const { text, ...entry } = document;
  transaction.objectStore(ENTRIES).put(entry);
  transaction.objectStore(TEXTS).put({ id: document.id, text });
  await completionOf(transaction);
  database.close();
  await trimToLimit();
}

export async function loadDocument(id: string): Promise<StoredDocument | null> {
  const database = await openDatabase();
  const transaction = database.transaction([ENTRIES, TEXTS], 'readonly');
  const entry = await requestOf(
    transaction.objectStore(ENTRIES).get(id) as IDBRequest<DocumentEntry | undefined>,
  );
  const record = await requestOf(
    transaction.objectStore(TEXTS).get(id) as IDBRequest<{ text: string } | undefined>,
  );
  database.close();
  if (entry === undefined || record === undefined) return null;
  return { ...entry, text: record.text };
}

export async function removeDocument(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction([ENTRIES, TEXTS], 'readwrite');
  transaction.objectStore(ENTRIES).delete(id);
  transaction.objectStore(TEXTS).delete(id);
  await completionOf(transaction);
  database.close();
}

export async function clearDocuments(): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction([ENTRIES, TEXTS], 'readwrite');
  transaction.objectStore(ENTRIES).clear();
  transaction.objectStore(TEXTS).clear();
  await completionOf(transaction);
  database.close();
}

async function trimToLimit(): Promise<void> {
  const entries = await listDocuments();
  const excess = entries.slice(MAX_TABS);
  for (const entry of excess) await removeDocument(entry.id);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      createStores(open.result);
    };
    open.onsuccess = () => {
      resolve(open.result);
    };
    open.onerror = () => {
      reject(open.error ?? new Error('No se pudo abrir IndexedDB'));
    };
  });
}

function createStores(database: IDBDatabase): void {
  if (!database.objectStoreNames.contains(ENTRIES)) {
    database.createObjectStore(ENTRIES, { keyPath: 'id' });
  }
  if (!database.objectStoreNames.contains(TEXTS)) {
    database.createObjectStore(TEXTS, { keyPath: 'id' });
  }
}

function transactionFor(
  database: IDBDatabase,
  name: string,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return database.transaction(name, mode).objectStore(name);
}

function requestOf<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Fallo una lectura de IndexedDB'));
    };
  });
}

function completionOf(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('Se abortó una escritura en IndexedDB'));
    };
  });
}
