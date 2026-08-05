#! /usr/bin/env node

/// <reference types="node" />

import "source-map-support/register.js";
import { dump } from "wtfnode";

import { AdbServerClient, AdbSync, LinuxFileType, Ref } from "@yume-chan/adb";
import { AdbServerNodeTcpConnector } from "@yume-chan/adb-server-node-tcp";
import { ReadableStream, WritableStream } from "@yume-chan/stream-extra";
import { Option, program } from "commander";
import { createReadStream } from "node:fs";
import { release, type } from "node:os";
import { basename } from "node:path";

program
    .name("tango-cli")
    .optionsGroup("global options:")
    .option("-d", "use USB device (error if multiple devices connected)")
    .option(
        "-e",
        "use TCP/IP device (error if multiple TCP/IP devices available)",
    )
    .addOption(
        new Option("-s <serial>", "use device with given serial").env(
            "ANDROID_SERIAL",
        ),
    )
    .option("-t <id>", "use device with given transport id", (value) =>
        BigInt(value),
    )
    .option("-H <host>", "name of adb server host", "localhost")
    .option(
        "-P <port>",
        "port of adb server",
        (value) => Number.parseInt(value, 10),
        5037,
    )
    .configureHelp({
        subcommandTerm(cmd) {
            let usage = cmd.usage();
            if (usage === "[options]" && cmd.options.length === 0) {
                usage = "";
            }
            return `${cmd.name()} ${usage}`;
        },
    });
program.optionsGroup();

function createClient() {
    const opts: { H: string; P: number } = program.opts();
    const connection = new AdbServerNodeTcpConnector({
        host: opts.H,
        port: opts.P,
    });
    const client = new AdbServerClient(connection);
    return client;
}

program
    .commandsGroup("general commands:")
    .command("devices")
    .usage("[-l]")
    .description("list connected devices (-l for long output)")
    .option("-l", "long output", false)
    .action(async (options: { l: boolean }) => {
        function appendTransportInfo(key: string, value: string | undefined) {
            if (value) {
                return ` ${key}:${value}`;
            }
            return "";
        }

        const client = createClient();
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
                    }`,
                );
            } else {
                console.log(`${device.serial}\tdevice`);
            }
        }
    });

program.helpCommand("help", "show this help message");
program.helpOption(false);

program
    .command("version")
    .description("show version num")
    .action(async () => {
        console.log("Android Debug Bridge version 1.0.41");
        console.log(
            "Version",
            await import("../package.json", { with: { type: "json" } }).then(
                (pkg) => pkg.default.version,
            ),
        );
        console.log("Installed as", process.argv[1]);
        console.log("Running on", type(), release());
    });

interface DeviceCommandOptions {
    d: true | undefined;
    e: true | undefined;
    s: string | undefined;
    t: bigint | undefined;
}

async function createAdb(options: DeviceCommandOptions) {
    const client = createClient();
    return await client.createAdb(
        options.d
            ? {
                  usb: true,
              }
            : options.e
              ? {
                    tcp: true,
                }
              : options.s !== undefined
                ? {
                      serial: options.s,
                  }
                : options.t !== undefined
                  ? {
                        transportId: options.t,
                    }
                  : undefined,
    );
}

program
    .commandsGroup("file transfer:")
    .command("push <source> <destination>")
    .usage("[-z <algorithm>] [-Z] <source> <destination>")
    .description("push file to device")
    .addOption(
        new Option(
            "-z <algorithm>",
            "enable compression with a specified algorithm",
        )
            .choices(["any", "none", "brotli", "lz4", "zstd"])
            .default("any")
            .conflicts("Z"),
    )
    .addOption(new Option("-Z", "disable compression").conflicts("z"))
    .configureHelp({ showGlobalOptions: true })
    .action(
        async (
            source: string,
            destination: string,
            options: DeviceCommandOptions & {
                Z: boolean;
                z: "any" | "none" | "brotli" | "lz4" | "zstd";
            },
        ) => {
            const adb = await createAdb(options);

            const destinationIsDirectory =
                await adb.sync.isDirectory(destination);
            if (destinationIsDirectory) {
                if (!destination.endsWith("/")) {
                    destination += "/";
                }
                destination += basename(source);
            }

            const start = Date.now();
            const result = await adb.sync.write({
                path: destination,
                type: LinuxFileType.File,
                readable: ReadableStream.from(createReadStream(source)),
                compression: options.Z
                    ? AdbSync.Compression.Format.None
                    : (
                          {
                              any: undefined,
                              none: AdbSync.Compression.Format.None,
                              brotli: AdbSync.Compression.Format.Brotli,
                              lz4: AdbSync.Compression.Format.Lz4,
                              zstd: AdbSync.Compression.Format.Zstd,
                          } satisfies Record<
                              string,
                              AdbSync.Compression.Format | undefined
                          >
                      )[options.z],
            });
            const duration = Date.now() - start;
            console.log(
                `${source}: 1 file pushed, 0 skipped. ${((result.bytesWritten / duration) * 1000).toFixed(1)} B/s (${result.bytesWritten} bytes in ${(duration / 1000).toFixed(3)}s) `,
            );
            const timeout = setTimeout(() => {
                dump({ fullStacks: true });
            }, 1500);
            timeout.unref();
        },
    );

program
    .commandsGroup("shell:")
    .command("shell [args...]")
    .usage("[options] [-- <args...>]")
    .description(
        "run remote shell command (interactive shell if no command given). `--` is required before command name.",
    )
    .configureHelp({ showGlobalOptions: true })
    .action(async (args: string[], options: DeviceCommandOptions) => {
        const ref = new Ref();

        const adb = await createAdb(options);
        const shell = await adb.subprocess.noneProtocol.pty(args);

        const inputWriter = shell.input.getWriter();

        process.stdin.setRawMode(true);
        process.stdin.on("data", (data: Uint8Array) => {
            inputWriter.write(data).catch((e) => {
                console.error(e);
                process.exit(1);
            });
        });

        shell.output
            .pipeTo(
                new WritableStream({
                    write(chunk) {
                        process.stdout.write(chunk);
                    },
                }),
            )
            .catch((e) => {
                console.error(e);
                process.exit(1);
            });

        shell.exited.then(
            () => {
                // `process.stdin.on("data")` will keep the process alive,
                // so call `process.exit` explicitly.
                process.exit(0);
            },
            (e) => {
                console.error(e);
                process.exit(1);
            },
        );

        ref.unref();
    });

program
    .commandsGroup("debugging:")
    .command("logcat [args...]")
    .usage("[-- <args...>")
    .description("show device log (logcat --help for more)")
    .configureHelp({ showGlobalOptions: true })
    .action(async (args: string[], options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        const logcat = await adb.subprocess.noneProtocol.spawn([
            "logcat",
            ...args,
        ]);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        process.on("SIGINT", async () => {
            await logcat.kill();
        });
        await logcat.output.pipeTo(
            new WritableStream({
                write: (chunk) => {
                    process.stdout.write(chunk);
                },
            }),
        );
    });

program
    .commandsGroup("scripting:")
    .command("reboot [mode]")
    .usage("[bootloader|recovery|sideload|sideload-auto-reboot]")
    .description(
        "reboot the device; defaults to booting system image but supports bootloader and recovery too. sideload reboots into recovery and automatically starts sideload mode, sideload-auto-reboot is the same but reboots after sideloading.",
    )
    .configureHelp({ showGlobalOptions: true })
    .action(async (mode: string | undefined, options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        await adb.power.reboot(mode);
    });

program
    .command("usb")
    .usage(" ")
    .description("restart adbd listening on USB")
    .configureHelp({ showGlobalOptions: true })
    .action(async (options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        const output = await adb.tcpip.disable();
        process.stdout.write(output, "utf8");
    });

program
    .command("tcpip <port>")
    .usage("<port>")
    .description("restart adbd listening on TCP on PORT")
    .configureHelp({ showGlobalOptions: true })
    .action(async (port: string, options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        const output = await adb.tcpip.setPort(Number.parseInt(port, 10));
        process.stdout.write(output, "utf8");
    });

program
    .command("kill-server")
    .description("kill the server if it is running")
    .configureHelp({ showGlobalOptions: true })
    .action(async () => {
        const client = createClient();
        await client.killServer();
    });

program.parse();
