import { createTransaction, openDatabase, waitRequest } from "./shared.js";

export const DefaultDatabaseName = "Tango";
export const DefaultStoreName = "Authentication";
export const Version1 = 1;

export async function getAllKeysV1() {
    const databases = await indexedDB.databases();
    if (
        databases.every(
            (database) =>
                database.name !== DefaultDatabaseName ||
                database.version !== Version1,
        )
    ) {
        return undefined;
    }

    const db = await openDatabase(DefaultDatabaseName, Version1, () => {});

    try {
        return await createTransaction(db, DefaultStoreName, (tx) => {
            const store = tx.objectStore(DefaultStoreName);
            return waitRequest(store.getAll() as IDBRequest<Uint8Array[]>);
        });
    } finally {
        db.close();
    }
}
