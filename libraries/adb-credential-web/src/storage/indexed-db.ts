import type { TangoDataStorage } from "./type.js";

function openDatabase() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("Tango", 1);
        request.onerror = () => {
            reject(request.error!);
        };
        request.onupgradeneeded = () => {
            const db = request.result;
            db.createObjectStore("Authentication", { autoIncrement: true });
        };
        request.onsuccess = () => {
            const db = request.result;
            resolve(db);
        };
    });
}

function createTransaction<T>(
    database: IDBDatabase,
    callback: (transaction: IDBTransaction) => T,
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const transaction = database.transaction("Authentication", "readwrite");
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

export class TangoIndexedDbStorage implements TangoDataStorage {
    async save(data: Uint8Array): Promise<undefined> {
        const db = await openDatabase();

        try {
            await createTransaction(db, (tx) => {
                const store = tx.objectStore("Authentication");
                store.add(data);
            });
        } finally {
            db.close();
        }
    }

    async *load(): AsyncGenerator<Uint8Array, void, void> {
        const db = await openDatabase();

        try {
            const keys = await createTransaction(db, (tx) => {
                return new Promise<Uint8Array[]>((resolve, reject) => {
                    const store = tx.objectStore("Authentication");
                    const getRequest = store.getAll();
                    getRequest.onerror = () => {
                        reject(getRequest.error!);
                    };
                    getRequest.onsuccess = () => {
                        resolve(getRequest.result as Uint8Array[]);
                    };
                });
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
                const store = tx.objectStore("Authentication");
                store.clear();
            });
        } finally {
            db.close();
        }
    }
}
