import type { TangoKey, TangoKeyStorage } from "../type.js";

import { createTransaction, openDatabase, waitRequest } from "./shared.js";
import { DefaultDatabaseName, DefaultStoreName, getAllKeysV1 } from "./v1.js";

const Version = 2;

export class TangoIndexedDbStorage implements TangoKeyStorage {
    readonly #databaseName: string;
    get databaseName() {
        return this.#databaseName;
    }

    readonly #storeName: string;
    get storeName() {
        return this.#storeName;
    }

    #openDatabasePromise: Promise<IDBDatabase> | undefined;

    constructor(options?: { databaseName?: string; storeName?: string }) {
        this.#databaseName = options?.databaseName ?? DefaultDatabaseName;
        this.#storeName = options?.storeName ?? DefaultStoreName;
    }

    async #openDatabaseCore() {
        const v1Keys = await getAllKeysV1();
        if (v1Keys) {
            await waitRequest(indexedDB.deleteDatabase(DefaultDatabaseName));
        }

        return await openDatabase(this.#databaseName, Version, (db) => {
            const store = db.createObjectStore(this.#storeName, {
                autoIncrement: true,
            });

            if (v1Keys) {
                for (const key of v1Keys) {
                    store.add({
                        privateKey: key,
                        name: undefined,
                    } satisfies TangoKey);
                }
            }
        });
    }

    async #openDatabase() {
        return (this.#openDatabasePromise ??= this.#openDatabaseCore());
    }

    async save(
        privateKey: Uint8Array,
        name: string | undefined,
    ): Promise<undefined> {
        const db = await this.#openDatabase();

        try {
            await createTransaction(db, this.#storeName, (tx) => {
                const store = tx.objectStore(this.#storeName);
                store.add({ privateKey, name } satisfies TangoKey);
            });
        } finally {
            db.close();
        }
    }

    async *load(): AsyncGenerator<TangoKey, void, void> {
        const db = await this.#openDatabase();

        try {
            const keys = await createTransaction(db, this.#storeName, (tx) => {
                const store = tx.objectStore(this.#storeName);
                return waitRequest(store.getAll() as IDBRequest<TangoKey[]>);
            });

            yield* keys;
        } finally {
            db.close();
        }
    }

    async clear() {
        const db = await this.#openDatabase();

        try {
            await createTransaction(db, this.#storeName, (tx) => {
                const store = tx.objectStore(this.#storeName);
                store.clear();
            });
        } finally {
            db.close();
        }
    }
}
