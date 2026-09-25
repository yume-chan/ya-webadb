/* eslint-disable require-yield */
import "fake-indexeddb/auto";
import assert from "node:assert";
import { describe, it } from "node:test";

import { createTransaction, openDatabase, waitRequest } from "./shared.js";

let id = 0;
function nextDatabaseName() {
    id += 1;
    return "database-" + id;
}

describe("waitRequest", () => {
    it("should resolve with the result of the request", async () => {
        const request = indexedDB.open(nextDatabaseName(), 1);
        const result = await waitRequest(request);
        assert.strictEqual(result instanceof IDBDatabase, true);
        result.close();
    });

    it("should reject if the request fails", async () => {
        const dbName = nextDatabaseName();

        const db = await waitRequest(indexedDB.open(dbName, 2));
        db.close();

        const request = indexedDB.open(dbName, 1);
        await assert.rejects(waitRequest(request), /VersionError/);
    });

    it("should throw if used inside a transaction", async () => {
        const db = await openDatabase(nextDatabaseName(), 1, (db) => {
            db.createObjectStore("store", { autoIncrement: true });
        });
        const tx = db.transaction("store", "readwrite");
        const store = tx.objectStore("store");
        const request = store.put({ value: 1 });
        await assert.rejects(
            () => waitRequest(request),
            /Cannot wait for a request inside a transaction/,
        );
        db.close();
    });
});

describe("openDatabase", () => {
    it("should close the database when callback finishes", async () => {
        let db!: IDBDatabase;
        await openDatabase(
            nextDatabaseName(),
            1,
            () => {},
            (db_) => {
                db = db_;
                return new Promise((resolve) => setTimeout(resolve, 0));
            },
        );
        assert.throws(() => db.transaction("store"), /InvalidStateError/);
    });
});

describe("transaction", () => {
    it("can't add requests asynchronously", async () => {
        const db = await openDatabase(nextDatabaseName(), 1, (db) => {
            db.createObjectStore("store", { autoIncrement: true });
        });
        const tx = db.transaction("store", "readwrite");
        const store = tx.objectStore("store");
        await new Promise(setImmediate);
        assert.throws(
            () => store.put({ value: 2 }),
            /TransactionInactiveError/,
        );
        db.close();
    });
});

describe("createTransaction", () => {
    it("should throw if callback throws", async () => {
        const db = await openDatabase(nextDatabaseName(), 1, (db) => {
            db.createObjectStore("store", { autoIncrement: true });
        });
        await assert.rejects(
            createTransaction(db, "store", function* () {
                throw new Error("Test error");
            }),
            /Test error/,
        );
        db.close();
    });

    it("should abort the transaction if callback throws", async () => {
        const db = await openDatabase(nextDatabaseName(), 1, (db) => {
            db.createObjectStore("store", { autoIncrement: true });
        });
        await assert.rejects(() =>
            createTransaction(
                db,
                "store",
                function* (_, store) {
                    yield store.add({ value: 1 });
                    throw new Error("Test error");
                },
                { mode: "readwrite" },
            ),
        );
        await createTransaction(db, "store", function* (_, store, waitRequest) {
            // Verify the `.add` operation was not committed
            const values = yield* waitRequest(store.getAll());
            assert.strictEqual(values.length, 0);
        });
        db.close();
    });

    it("should throw if callback throws after yielding", async () => {
        const db = await openDatabase(nextDatabaseName(), 1, (db) => {
            db.createObjectStore("store", { autoIncrement: true });
        });
        await assert.rejects(
            createTransaction(db, "store", function* (_, store) {
                yield store.count();
                throw new Error("Test error after yielding");
            }),
            /Test error after yielding/,
        );
        db.close();
    });

    it("yield should return request's result", async () => {
        const db = await openDatabase(nextDatabaseName(), 1, (db) => {
            db.createObjectStore("store", { autoIncrement: true });
        });
        await createTransaction(db, "store", function* (_, store) {
            const result = yield store.count();
            assert.strictEqual(result, 0);
        });
        db.close();
    });

    it("yield should throw if request fails", async () => {
        const db = await openDatabase(nextDatabaseName(), 1, (db) => {
            db.createObjectStore("store", { keyPath: "value" });
        });
        await assert.rejects(() =>
            createTransaction(
                db,
                "store",
                function* (_, store) {
                    yield store.add({ value: 1 });
                    try {
                        yield store.add({ value: 1 });
                        assert.fail("Expected store.add to throw");
                    } catch (e) {
                        assert.deepEqual((e as Error).name, "ConstraintError");
                        throw e;
                    }
                },
                { mode: "readwrite" },
            ),
        );
        db.close();
    });

    it("yield should return the value if it's not a request", async () => {
        const db = await openDatabase(nextDatabaseName(), 1, (db) => {
            db.createObjectStore("store", { autoIncrement: true });
        });
        await createTransaction(db, "store", function* () {
            const result = yield 42 as never;
            assert.strictEqual(result, 42);
        });
        db.close();
    });

    it("waitRequest should return request's result", async () => {
        const db = await openDatabase(nextDatabaseName(), 1, (db) => {
            db.createObjectStore("store", { autoIncrement: true });
        });
        await createTransaction(db, "store", function* (_, store, waitRequest) {
            const result = yield* waitRequest(store.count());
            assert.strictEqual(result, 0);
        });
        db.close();
    });

    it("should allow sequential requests", async () => {
        const db = await openDatabase(nextDatabaseName(), 1, (db) => {
            db.createObjectStore("store", { autoIncrement: true });
        });
        await createTransaction(
            db,
            "store",
            function* (_, store) {
                yield store.add({ value: 1 });
                yield store.add({ value: 2 });
            },
            { mode: "readwrite" },
        );
        await createTransaction(db, "store", function* (_, store, waitRequest) {
            const values = yield* waitRequest(
                store.getAll() as IDBRequest<{ value: number }[]>,
            );
            assert.deepStrictEqual(values[0], { value: 1 });
            assert.deepStrictEqual(values[1], { value: 2 });
        });
        db.close();
    });

    it("should continue if request error is handled", async () => {
        const db = await openDatabase(nextDatabaseName(), 1, (db) => {
            db.createObjectStore("store", { keyPath: "value" });
        });
        await createTransaction(
            db,
            "store",
            function* (_, store) {
                yield store.add({ value: 1 });
                try {
                    yield store.add({ value: 1 });
                } catch {
                    // ignore
                }
                yield store.add({ value: 2 });
            },
            { mode: "readwrite" },
        );
        await createTransaction(db, "store", function* (_, store, waitRequest) {
            const values = yield* waitRequest(
                store.getAll() as IDBRequest<{ value: number }[]>,
            );
            assert.deepStrictEqual(values[0], { value: 1 });
            assert.deepStrictEqual(values[1], { value: 2 });
        });
        db.close();
    });

    it("should ignore double transaction abortion", async () => {
        const db = await openDatabase(nextDatabaseName(), 1, (db) => {
            db.createObjectStore("store", { keyPath: "value" });
        });

        await assert.rejects(
            () =>
                createTransaction(
                    db,
                    "store",
                    function* (tx) {
                        tx.commit();
                        throw new Error("Transaction aborted");
                    },
                    { mode: "readwrite" },
                ),
            /Transaction aborted/,
        );
        db.close();
    });
});
