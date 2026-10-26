import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestContext } from "node:test";
import { test } from "node:test";

import { adbNoneProtocolSpawner } from "@yume-chan/adb";
import type { Adb, AdbNoneProtocolProcess } from "@yume-chan/adb";
import { DefaultServerPath } from "@yume-chan/scrcpy";
import { ReadableStream, WritableStream } from "@yume-chan/stream-extra";

import { AdbScrcpyOptions3_3_3 } from "./3_3_3.js";
import { AdbScrcpyClient } from "./client.js";

async function fixture(t: TestContext, uid: number) {
    const directory = await mkdtemp(join(tmpdir(), "adb-scrcpy-uid-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const suLog = join(directory, "su.log");
    await writeFile(
        join(directory, "id"),
        `#!/bin/sh\nprintf '%s\\n' '${uid}'\n`,
        { mode: 0o755 },
    );
    await writeFile(
        join(directory, "su"),
        '#!/bin/sh\nprintf \'%s\\n\' "$1" > "$SCRCPY_TEST_SU_LOG"\nshift\nexec "$@"\n',
        { mode: 0o755 },
    );
    await writeFile(
        join(directory, "app_process"),
        '#!/bin/sh\nprintf \'%s\\n\' "$CLASSPATH" "$@"\n',
        {
            mode: 0o755,
        },
    );
    const exited = Promise.withResolvers<void>();
    const serverProcess: AdbNoneProtocolProcess = {
        stdin: new WritableStream(),
        output: new ReadableStream(),
        exited: exited.promise,
        kill: t.mock.fn(() => {
            exited.resolve();
            return Promise.resolve();
        }),
    };
    let output = "";
    const spawn = t.mock.fn((command: string | readonly string[]) => {
        output = execFileSync(
            "sh",
            ["-c", typeof command === "string" ? command : command.join(" ")],
            {
                encoding: "utf8",
                env: {
                    ...process.env,
                    PATH: `${directory}:${process.env["PATH"]}`,
                    SCRCPY_TEST_SU_LOG: suLog,
                },
            },
        );
        return Promise.resolve(serverProcess);
    });
    const adb = { subprocess: { noneProtocol: { spawn } } } as unknown as Adb;
    const dispose = t.mock.fn(() => {});
    return {
        serverProcess,
        spawn,
        dispose,
        directory,
        suLog,
        output: () => output,
        async start(
            clientOptions?: ConstructorParameters<
                typeof AdbScrcpyOptions3_3_3
            >[1],
        ) {
            const options = new AdbScrcpyOptions3_3_3(
                { video: false, audio: false, control: false },
                clientOptions,
            );
            t.mock.method(
                options,
                "createConnection",
                () =>
                    ({
                        initialize: () => Promise.resolve(),
                        getStreams: () => Promise.resolve({}),
                        dispose,
                    }) as never,
            );
            return AdbScrcpyClient.start(adb, DefaultServerPath, options);
        },
    };
}

for (const uid of [0, 2000]) {
    test(
        `AdbScrcpyClient starts as shell when adbd UID is ${uid}`,
        { skip: process.platform === "win32" },
        async (t) => {
            const device = await fixture(t, uid);
            const client = await device.start();
            try {
                assert.equal(
                    device.spawn.mock.callCount(),
                    1,
                    "UID selection must not add an ADB round trip",
                );
                assert.deepEqual(device.output().trimEnd().split("\n"), [
                    DefaultServerPath,
                    "/",
                    "com.genymobile.scrcpy.Server",
                    client.options.version,
                    ...client.options.serialize(),
                ]);
                if (uid === 0) {
                    assert.equal(
                        await readFile(device.suLog, "utf8"),
                        "2000\n",
                    );
                } else {
                    await assert.rejects(access(device.suLog), {
                        code: "ENOENT",
                    });
                }
                assert.equal(device.dispose.mock.callCount(), 1);
            } finally {
                await client.close();
            }
        },
    );
}

test("AdbScrcpyClient preserves custom spawners without probing or wrapping", async (t) => {
    const device = await fixture(t, 0);
    const spawner = t.mock.fn(
        adbNoneProtocolSpawner(() => Promise.resolve(device.serverProcess)),
    );
    const client = await device.start({ spawner });
    try {
        assert.equal(device.spawn.mock.callCount(), 0);
        assert.deepEqual(spawner.mock.calls[0]?.arguments[0], [
            `CLASSPATH=${DefaultServerPath}`,
            "app_process",
            "/",
            "com.genymobile.scrcpy.Server",
            client.options.version,
            ...client.options.serialize(),
        ]);
    } finally {
        await client.close();
    }
});

test(
    "AdbScrcpyClient reports su failures and disposes the connection",
    { skip: process.platform === "win32" },
    async (t) => {
        const device = await fixture(t, 0);
        await writeFile(join(device.directory, "su"), "#!/bin/sh\nexit 23\n");
        await assert.rejects(device.start(), (error) => {
            assert.equal((error as { status?: number }).status, 23);
            return true;
        });
        assert.equal(
            device.spawn.mock.callCount(),
            1,
            "A failed UID switch must not retry as root",
        );
        assert.equal(device.dispose.mock.callCount(), 1);
    },
);
