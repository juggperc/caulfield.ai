const DB_NAME_PREFIX = "caulfield.library.v1";
const DB_VERSION = 1;

export const libraryDatabaseNameForScope = (scope: string): string => {
  const s = scope.trim().slice(0, 120);
  return s.length > 0 ? `${DB_NAME_PREFIX}:${s}` : `${DB_NAME_PREFIX}:anon`;
};
const META = "meta";
const BLOBS = "blobs";

const req = <T>(request: IDBRequest): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("IDB request failed"));
    request.onsuccess = () => resolve(request.result as T);
  });

const txDone = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IDB transaction aborted"));
  });

export const openLibraryDb = (dbName: string): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const r = indexedDB.open(dbName, DB_VERSION);
    r.onerror = () => reject(r.error ?? new Error("IDB open failed"));
    r.onsuccess = () => resolve(r.result);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(BLOBS)) {
        db.createObjectStore(BLOBS);
      }
    };
  });

export const idbPutMetaAndBlob = async (
  db: IDBDatabase,
  meta: Record<string, unknown>,
  blob: ArrayBuffer,
): Promise<void> => {
  const id = meta.id as string;
  const tx = db.transaction([META, BLOBS], "readwrite");
  tx.objectStore(META).put(meta);
  tx.objectStore(BLOBS).put(blob, id);
  await txDone(tx);
};

export const idbGetAllMeta = async (
  db: IDBDatabase,
): Promise<Record<string, unknown>[]> => {
  const tx = db.transaction(META, "readonly");
  return req<Record<string, unknown>[]>(tx.objectStore(META).getAll());
};

export const idbGetBlob = async (
  db: IDBDatabase,
  id: string,
): Promise<ArrayBuffer | undefined> => {
  const tx = db.transaction(BLOBS, "readonly");
  return req<ArrayBuffer | undefined>(tx.objectStore(BLOBS).get(id));
};

export const idbDeleteItem = async (db: IDBDatabase, id: string): Promise<void> => {
  const tx = db.transaction([META, BLOBS], "readwrite");
  tx.objectStore(META).delete(id);
  tx.objectStore(BLOBS).delete(id);
  await txDone(tx);
};
