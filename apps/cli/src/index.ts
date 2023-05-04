import "source-map-support/register.js";

import {
    Adb,
    AdbBanner,
    AdbServerClient,
    AdbServerTransport,
    NOOP,
} from "@yume-chan/adb";
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
                        appendTransportInfo("product", device.banner.product)
                    }${
                        appendTransportInfo("model", device.banner.model)
                    }${
                        appendTransportInfo("device", device.banner.device)
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
    .option("-t <id>", "transport id", (value) => Number.parseInt(value, 10))
    .action(async (args: string[], options: { t: number }) => {
        const opts: { H: string; P: number } = program.opts();
        const connection = new AdbServerNodeTcpConnection({
            host: opts.H,
            port: opts.P,
        });
        const client = new AdbServerClient(connection);
        const features = await client.getDeviceFeatures({
            transportId: options.t,
        });
        const transport = new AdbServerTransport(
            client,
            "device",
            new AdbBanner("", "", "", features),
            options.t
        );
        const adb = new Adb(transport);
        const shell = await adb.subprocess.shell(args);
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
    });

program.parse();
