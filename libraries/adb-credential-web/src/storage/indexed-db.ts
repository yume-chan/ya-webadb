import type { TangoKey, TangoKeyStorage } from "./type.js";

const StoreName = "Authentication";

function waitRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        request.onerror = () => {
            reject(request.error!);
        };
        request.onsuccess = () => {
            resolve(request.result);
        };
    });
}

async function openDatabase() {
    const request = indexedDB.open("Tango", 1);
    request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore(StoreName, { autoIncrement: true });
    };
    const db = await waitRequest(request);

    // Maintain compatibility with v2 (values are pure `Uint8Array`s)
    // IndexedDB API doesn't support async upgrade transaction,
    // so have to open with old version, read the data, close the database,
    // then open with new version to trigger upgrade again
    if (db.version === 1) {
        const keys = await createTransaction(db, (tx) =>
            waitRequest(
                tx.objectStore(StoreName).getAll() as IDBRequest<Uint8Array[]>,
            ),
        );

        db.close();

        const request = indexedDB.open("Tango", 2);
        request.onupgradeneeded = () => {
            const tx = request.transaction!;
            const store = tx.objectStore(StoreName);
            store.clear();
            for (const key of keys) {
                store.add({
                    privateKey: key,
                    name: undefined,
                } satisfies TangoKey);
            }
        };
        return await waitRequest(request);
    }

    return db;
}

function createTransaction<T>(
    database: IDBDatabase,
    callback: (transaction: IDBTransaction) => T,
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(StoreName, "readwrite");
        transaction.onerror = () => {
            reject(transaction.error!);
        };
        transaction.oncomplete = () => {
            resolve(result);
        };
        transaction.onabort = () => {
            reject(transaction.error ?? new Error("Transaction aborted"));
        };

        const result = callback(transaction);
    });
}

export class TangoIndexedDbStorage implements TangoKeyStorage {
    async save(
        privateKey: Uint8Array,
        name: string | undefined,
    ): Promise<undefined> {
        const db = await openDatabase();

        try {
            await createTransaction(db, (tx) => {
                const store = tx.objectStore(StoreName);
                store.add({ privateKey, name } satisfies TangoKey);
            });
        } finally {
            db.close();
        }
    }

    async *load(): AsyncGenerator<TangoKey, void, void> {
        const db = await openDatabase();

        try {
            const keys = await createTransaction(db, (tx) => {
                const store = tx.objectStore(StoreName);
                return waitRequest(store.getAll() as IDBRequest<TangoKey[]>);
            });

            yield* keys;
        } finally {
            db.close();
        }
    }

    async clear() {
        const db = await openDatabase();

        try {
            await createTransaction(db, (tx) => {
                const store = tx.objectStore(StoreName);
                store.clear();
            });
        } finally {
            db.close();
        }
    }
}
