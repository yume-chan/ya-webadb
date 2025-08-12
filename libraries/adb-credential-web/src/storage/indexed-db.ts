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

export class TangoIndexedDbStorage implements TangoDataStorage {
    async save(data: Uint8Array): Promise<undefined> {
        const db = await openDatabase();

        return new Promise<undefined>((resolve, reject) => {
            const transaction = db.transaction("Authentication", "readwrite");
            const store = transaction.objectStore("Authentication");
            const putRequest = store.add(data);
            putRequest.onerror = () => {
                reject(putRequest.error!);
            };
            putRequest.onsuccess = () => {
                resolve(undefined);
            };
            transaction.onerror = () => {
                reject(transaction.error!);
            };
            transaction.oncomplete = () => {
                db.close();
            };
        });
    }

    async *load(): AsyncGenerator<Uint8Array, void, void> {
        const db = await openDatabase();

        const keys = await new Promise<Uint8Array[]>((resolve, reject) => {
            const transaction = db.transaction("Authentication", "readonly");
            const store = transaction.objectStore("Authentication");
            const getRequest = store.getAll();
            getRequest.onerror = () => {
                reject(getRequest.error!);
            };
            getRequest.onsuccess = () => {
                resolve(getRequest.result as Uint8Array[]);
            };
            transaction.onerror = () => {
                reject(transaction.error!);
            };
            transaction.oncomplete = () => {
                db.close();
            };
        });

        yield* keys;
    }

    async clear() {
        const db = await openDatabase();

        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction("Authentication", "readwrite");
            const store = transaction.objectStore("Authentication");
            const clearRequest = store.clear();
            clearRequest.onerror = () => {
                reject(clearRequest.error!);
            };
            clearRequest.onsuccess = () => {
                resolve();
            };
            transaction.onerror = () => {
                reject(transaction.error!);
            };
            transaction.oncomplete = () => {
                db.close();
            };
        });
    }
}
