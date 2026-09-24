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
            // V1 uses hardcoded database name,
            // Delete the database for recreation
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

        await createTransaction(
            db,
            this.#storeName,
            function* (_, store) {
                yield store.add({ privateKey, name } satisfies TangoKey);
            },
            { mode: "readwrite" },
        );
    }

    async *load(): AsyncGenerator<TangoKey, void, void> {
        const db = await this.#openDatabase();

        const keys = await createTransaction(
            db,
            this.#storeName,
            function* (_, store, waitRequest) {
                return yield* waitRequest(
                    store.getAll() as IDBRequest<TangoKey[]>,
                );
            },
        );

        yield* keys;
    }

    async clear() {
        const db = await this.#openDatabase();

        await createTransaction(
            db,
            this.#storeName,
            function* (_, store) {
                yield store.clear();
            },
            { mode: "readwrite" },
        );
    }

    close() {
        return this.#openDatabasePromise?.then((db) => void db.close());
    }
}
