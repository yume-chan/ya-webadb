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
): Promise<IDBDatabase>;
export async function openDatabase<T>(
    name: string,
    version: number,
    onUpgrade: (db: IDBDatabase) => undefined,
    callback: (db: IDBDatabase) => T,
): Promise<T>;
export async function openDatabase<T>(
    name: string,
    version: number,
    onUpgrade: (db: IDBDatabase) => undefined,
    callback?: (db: IDBDatabase) => T,
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

function advance<T>(
    iterator: Generator<unknown, T, unknown>,
    { done, value }: IteratorResult<unknown, T>,
) {
    if (done) {
        return Promise.resolve(value);
    }
    if (value instanceof IDBRequest) {
        return new Promise<T>((resolve, reject) => {
            value.onsuccess = () => {
                // The transaction is "active" only
                // when handling a request's success or error events.
                try {
                    resolve(advance(iterator, iterator.next(value.result)));
                } catch (e) {
                    // Prevent automatic transaction abortion
                    // https://w3c.github.io/IndexedDB/#ref-for-abort-a-transaction%E2%91%A0%E2%91%A1

                    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                    reject(e);
                }
            };
            value.onerror = (e) => {
                try {
                    // Prevent automatic transaction abortion
                    // https://w3c.github.io/IndexedDB/#ref-for-canceled-flag%E2%91%A0
                    e.preventDefault();

                    // Prevent event buddles to transaction's `onerror`
                    // https://w3c.github.io/IndexedDB/#ref-for-get-the-parent%E2%91%A1
                    e.stopPropagation();

                    // Throw the error to the generator so it can handle it.
                    resolve(advance(iterator, iterator.throw(value.error)));
                } catch (e) {
                    // Prevent automatic transaction abortion
                    // https://w3c.github.io/IndexedDB/#ref-for-abort-a-transaction%E2%91%A0%E2%91%A1

                    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                    reject(e);
                }
            };
        });
    }
    return advance(iterator, iterator.next(value));
}

function start<T>(generator: Generator<unknown, T, unknown>) {
    return advance(generator, generator.next(undefined));
}

export function createTransaction<T>(
    database: IDBDatabase,
    storeName: string,
    callback: (
        transaction: IDBTransaction,
        store: IDBObjectStore,
        waitRequest: <U>(
            request: IDBRequest<U>,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) => Iterable<IDBRequest<any>, U, unknown>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) => Generator<IDBRequest<any>, T, unknown>,
    options: IDBTransactionOptions & { mode: IDBTransactionMode } = {
        mode: "readonly",
    },
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(storeName, options.mode);

        let result!: T;
        transaction.oncomplete = () => {
            resolve(result);
        };
        transaction.onabort = () => {
            reject(transaction.error ?? new Error("Transaction aborted"));
        };
        // `IDBTransaction`'s `error` event only receives bubbled events from its requests
        // So it doesn't need to be listened to

        const handleError = (e: unknown) => {
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            reject(e);

            try {
                transaction.abort();
            } catch {
                // ignore
            }
        };

        try {
            const iterator = callback(
                transaction,
                transaction.objectStore(storeName),
                function* <U>(
                    request: IDBRequest<U>,
                ): Generator<IDBRequest<U>, U, U> {
                    return yield request;
                },
            );
            start(iterator).then((value) => (result = value), handleError);
        } catch (e) {
            handleError(e);
        }
    });
}
