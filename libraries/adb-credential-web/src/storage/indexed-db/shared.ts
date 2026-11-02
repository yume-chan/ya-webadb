/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Convert an IndexedDB request into a promise.
 *
 * Must not be used inside transactions.
 * @param request The IndexedDB request to wait for.
 * @returns
 * A promise that resolves with the result of the request
 * or rejects with the request's error.
 */
export function waitRequest<T>(request: IDBRequest<T>): Promise<T> {
    if (request.transaction) {
        return Promise.reject(
            new Error("Cannot wait for a request inside a transaction."),
        );
    }

    return new Promise<T>((resolve, reject) => {
        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = () => {
            reject(request.error!);
        };
    });
}

export async function openDatabase(
    name: string,
    version: number,
    onUpgrade: (db: IDBDatabase) => undefined,
): Promise<IDBDatabase>;
export async function openDatabase<T>(
    name: string,
    version: number,
    onUpgrade: (db: IDBDatabase) => undefined,
    callback: (db: IDBDatabase) => T | Promise<T>,
): Promise<T>;
export async function openDatabase<T>(
    name: string,
    version: number,
    onUpgrade: (db: IDBDatabase) => undefined,
    callback?: (db: IDBDatabase) => T | Promise<T>,
): Promise<IDBDatabase | T> {
    const request = indexedDB.open(name, version);

    request.onupgradeneeded = () => {
        const db = request.result;
        onUpgrade(db);
    };

    const db = await waitRequest(request);

    if (callback) {
        try {
            return await callback(db);
        } finally {
            db.close();
        }
    }

    return db;
}

function waitRequestInTransaction<T>(
    generator: Generator<unknown, T, unknown>,
    request: IDBRequest<unknown>,
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        request.onsuccess = () => {
            try {
                // The transaction is "active" only
                // when handling a request's success or error events.
                // Run next section of the generator function.
                resolve(advance(generator, generator.next(request.result)));
            } catch (e) {
                // Prevent automatic transaction abortion
                // https://w3c.github.io/IndexedDB/#ref-for-abort-a-transaction%E2%91%A0%E2%91%A1

                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                reject(e);
            }
        };
        request.onerror = (e) => {
            try {
                // Prevent automatic transaction abortion
                // https://w3c.github.io/IndexedDB/#ref-for-canceled-flag%E2%91%A0
                e.preventDefault();

                // Prevent the event from bubbling to the transaction's `onerror`
                // https://w3c.github.io/IndexedDB/#ref-for-get-the-parent%E2%91%A1
                e.stopPropagation();

                // Let the generator function handle the error.
                resolve(advance(generator, generator.throw(request.error)));
            } catch (e) {
                // Prevent automatic transaction abortion
                // https://w3c.github.io/IndexedDB/#ref-for-abort-a-transaction%E2%91%A0%E2%91%A1

                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                reject(e);
            }
        };
    });
}

function advance<T>(
    generator: Generator<unknown, T, unknown>,
    result: IteratorResult<unknown, T>,
) {
    do {
        if (result instanceof Promise) {
            // Check if `generator` is async.
            // Shouldn't be possible with TypeScript type check,
            // but just in case
            throw new Error("Async generators are not supported");
        }
        if (result.done) {
            return result.value;
        }
        if (result.value instanceof IDBRequest) {
            return waitRequestInTransaction(generator, result.value);
        }

        // Yielding a non-IDBRequest value doesn't make sense in this context,
        // but we just continue the loop.
        result = generator.next(result.value);
    } while (true);
}

function waitTransaction(transaction: IDBTransaction): Promise<undefined> {
    return new Promise<undefined>((resolve, reject) => {
        transaction.oncomplete = () => {
            resolve(undefined);
        };
        transaction.onabort = () => {
            reject(transaction.error ?? new Error("Transaction aborted"));
        };
        // `IDBTransaction`'s `error` event only receives bubbled events from its requests
        // So it doesn't need to be listened to
    });
}

type WaitRequestHelper = <T>(
    request: IDBRequest<T>,
) => Iterable<IDBRequest<any>, T, unknown>;

function* waitRequestHelper<T>(
    request: IDBRequest<T>,
): Iterable<IDBRequest<any>, T, T> {
    return yield request;
}

type TransactionCallback<T> = (
    transaction: IDBTransaction,
    store: IDBObjectStore,
    waitRequest: WaitRequestHelper,
) => Generator<IDBRequest<any>, T, unknown>;

export async function createTransaction<T>(
    database: IDBDatabase,
    storeName: string,
    callback: TransactionCallback<T>,
    options: IDBTransactionOptions & { mode: IDBTransactionMode } = {
        mode: "readonly",
    },
): Promise<T> {
    const transaction = database.transaction(storeName, options.mode);
    const objectStore = transaction.objectStore(storeName);

    try {
        const generator = callback(transaction, objectStore, waitRequestHelper);
        const [result] = await Promise.all([
            advance(generator, generator.next(undefined)),
            waitTransaction(transaction),
        ]);
        return result;
    } catch (e) {
        try {
            transaction.abort();
        } catch {
            // ignore
        }
        throw e;
    }
}
