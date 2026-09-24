import { createTransaction, openDatabase } from "./shared.js";

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

    return await openDatabase(
        DefaultDatabaseName,
        Version1,
        () => {},
        (db) =>
            createTransaction(
                db,
                DefaultStoreName,
                function* (_, store, waitRequest) {
                    return yield* waitRequest(
                        store.getAll() as IDBRequest<Uint8Array[]>,
                    );
                },
            ),
    );
}
