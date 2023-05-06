import "source-map-support/register.js";

import { Adb, AdbServerClient, NOOP } from "@yume-chan/adb";
import { AdbServerNodeTcpConnection } from "@yume-chan/adb-server-node-tcp";
import {
    ConsumableWritableStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import { program } from "commander";

program
    .name("tango-cli")
    .option("-H <host>", "name of adb server host", "127.0.0.1")
    .option(
        "-P <port>",
        "port of adb server",
        (value) => Number.parseInt(value, 10),
        5037
    );

function appendTransportInfo(key: string, value: string | undefined) {
    if (value) {
        return ` ${key}:${value}`;
    }
    return "";
}

program
    .command("devices")
    .option("-l", "long output", false)
    .action(async (options: { l: boolean }) => {
        const opts: { H: string; P: number } = program.opts();
        const connection = new AdbServerNodeTcpConnection({
            host: opts.H,
            port: opts.P,
        });
        const client = new AdbServerClient(connection);
        const devices = await client.getDevices();
        for (const device of devices) {
            if (options.l) {
                console.log(
                    // prettier-ignore
                    `${
                        device.serial.padEnd(22)
                    }device${
                        appendTransportInfo("product", device.product)
                    }${
                        appendTransportInfo("model", device.model)
                    }${
                        appendTransportInfo("device", device.device)
                    }${
                        appendTransportInfo("transport_id", device.transportId.toString())
                    }`
                );
            } else {
                console.log(`${device.serial}\tdevice`);
            }
        }
    });

program
    .command("shell [args...]")
    .description(
        "run remote shell command (interactive shell if no command given). `--` is required before command name."
    )
    .usage("[options] [-- <args...>]")
    .option("-t <id>", "use device with given transport id", (value) =>
        BigInt(value)
    )
    .action(async (args: string[], options: { t: bigint | undefined }) => {
        const opts: { H: string; P: number } = program.opts();
        const connection = new AdbServerNodeTcpConnection({
            host: opts.H,
            port: opts.P,
        });
        const client = new AdbServerClient(connection);
        const transport = await client.createTransport(
            options.t !== undefined
                ? {
                      transportId: options.t,
                  }
                : undefined
        );
        const adb = new Adb(transport);
        const shell = await adb.subprocess.shell(args);

        // TODO: intercept Ctrl+C and send it to the shell

        const stdinWriter = shell.stdin.getWriter();
        process.stdin.on("data", (data: Uint8Array) => {
            ConsumableWritableStream.write(stdinWriter, data).catch(NOOP);
        });

        shell.stdout
            .pipeTo(
                new WritableStream({
                    write(chunk) {
                        process.stdout.write(chunk);
                    },
                })
            )
            .catch(NOOP);

        shell.exit.then((code) => {
            // `process.stdin.on("data")` will keep the process alive,
            // so call `process.exit` explicitly.
            process.exit(code);
        }, NOOP);
    });

program.parse();
