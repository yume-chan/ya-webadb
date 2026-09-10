import * as assert from "node:assert";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, it } from "node:test";

import type { Adb } from "@yume-chan/adb";
import { AdbSync } from "@yume-chan/adb";

import { AdbServerNodeJsClient } from "./client.js";

// Opt in with ADB_TEST_SERIAL and an already running ADB server.
describe(
    "sendV1",
    { skip: !process.env.ADB_TEST_SERIAL, concurrency: false },
    () => {
        let adb: Adb;
        let pool: AdbSync.SocketPool;
        let directory: string;

        beforeEach(async () => {
            adb = await new AdbServerNodeJsClient().createAdb({
                serial: process.env.ADB_TEST_SERIAL!,
            });
            pool = new AdbSync.SocketPool(adb);
            directory = `/data/local/tmp/adb-sync-${randomUUID()}`;
            await adb.subprocess.noneProtocol
                .spawn(["mkdir", directory])
                .wait();
        });

        afterEach(async () => {
            await pool?.dispose();
            if (adb) {
                try {
                    await adb.subprocess.noneProtocol
                        .spawn(["rm", "-rf", directory])
                        .wait();
                } finally {
                    await adb.close();
                }
            }
        });

        it(
            "writes all data across packet boundaries",
            { timeout: 15_000 },
            async () => {
                const path = `${directory}/file`;
                const content = new Uint8Array(
                    AdbSync.Send.MaxPacketSize + 17,
                ).fill(42);
                const session = await AdbSync.Send.sendV1({ pool, path });
                const writer = session.writable.getWriter();
                try {
                    await writer.write(content);
                    await writer.close();
                    const actual = await adb.subprocess.noneProtocol
                        .spawn(["cat", path])
                        .wait();
                    assert.strictEqual(actual.length, content.length);
                    assert.ok(
                        actual.every(
                            (value, index) => value === content[index],
                        ),
                    );
                    assert.strictEqual(session.bytesWritten, content.length);
                } finally {
                    writer.releaseLock();
                }
            },
        );

        it(
            "rejects when the destination is a directory",
            { timeout: 15_000 },
            async () => {
                const session = await AdbSync.Send.sendV1({
                    pool,
                    path: directory,
                });
                const writer = session.writable.getWriter();
                try {
                    await assert.rejects(async () => {
                        await writer.write(new Uint8Array([1]));
                        await writer.close();
                    }, AdbSync.Error);
                } finally {
                    writer.releaseLock();
                }
            },
        );

        it(
            "creates an empty file before completing",
            { timeout: 15_000 },
            async () => {
                const path = `${directory}/empty`;
                const session = await AdbSync.Send.sendV1({ pool, path });
                const writer = session.writable.getWriter();
                try {
                    await writer.close();
                    const stat = await adb.sync.lstat(path);
                    assert.strictEqual(stat.mode & 0o170000, 0o100000);
                    assert.strictEqual(Number(stat.size), 0);
                    assert.strictEqual(session.bytesWritten, 0);
                } finally {
                    writer.releaseLock();
                }
            },
        );
    },
);
