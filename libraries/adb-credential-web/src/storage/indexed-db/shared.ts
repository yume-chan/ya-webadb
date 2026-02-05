export function waitRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        request.onerror = () => {
            reject(request.error!);
        };
        request.onsuccess = () => {
            resolve(request.result);
        };
    });
}

export async function openDatabase(
    name: string,
    version: number,
    onUpgrade: (db: IDBDatabase) => undefined,
): Promise<IDBDatabase> {
    const request = indexedDB.open(name, version);

    request.onupgradeneeded = () => {
        const db = request.result;
        onUpgrade(db);
    };

    return await waitRequest(request);
}

export function createTransaction<T>(
    database: IDBDatabase,
    storeName: string,
    callback: (transaction: IDBTransaction) => T,
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(storeName, "readwrite");
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
