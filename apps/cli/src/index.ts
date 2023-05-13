import "source-map-support/register.js";

import { Adb, AdbServerClient } from "@yume-chan/adb";
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

function createClient() {
    const opts: { H: string; P: number } = program.opts();
    const connection = new AdbServerNodeTcpConnection({
        host: opts.H,
        port: opts.P,
    });
    const client = new AdbServerClient(connection);
    return client;
}

program
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
                    }`
                );
            } else {
                console.log(`${device.serial}\tdevice`);
            }
        }
    });

interface DeviceCommandOptions {
    d: true | undefined;
    e: true | undefined;
    s: string | undefined;
    t: bigint | undefined;
}

function createDeviceCommand(nameAndArgs: string) {
    return program
        .command(nameAndArgs)
        .option("-d", "use USB device (error if multiple devices connected)")
        .option(
            "-e",
            "use TCP/IP device (error if multiple TCP/IP devices available)"
        )
        .option(
            "-s <serial>",
            "use device with given serial (overrides $ANDROID_SERIAL)",
            process.env.ANDROID_SERIAL
        )
        .option("-t <id>", "use device with given transport id", (value) =>
            BigInt(value)
        );
}

async function createAdb(options: DeviceCommandOptions) {
    const client = createClient();
    const transport = await client.createTransport(
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
            : undefined
    );
    const adb = new Adb(transport);
    return adb;
}

createDeviceCommand("shell [args...]")
    .usage("[options] [-- <args...>]")
    .description(
        "run remote shell command (interactive shell if no command given). `--` is required before command name."
    )
    .configureHelp({ showGlobalOptions: true })
    .action(async (args: string[], options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        const shell = await adb.subprocess.shell(args);

        const stdinWriter = shell.stdin.getWriter();

        process.stdin.setRawMode(true);
        process.stdin.on("data", (data: Uint8Array) => {
            ConsumableWritableStream.write(stdinWriter, data).catch((e) => {
                console.error(e);
                process.exit(1);
            });
        });

        shell.stdout
            .pipeTo(
                new WritableStream({
                    write(chunk) {
                        process.stdout.write(chunk);
                    },
                })
            )
            .catch((e) => {
                console.error(e);
                process.exit(1);
            });

        shell.exit.then(
            (code) => {
                // `process.stdin.on("data")` will keep the process alive,
                // so call `process.exit` explicitly.
                process.exit(code);
            },
            (e) => {
                console.error(e);
                process.exit(1);
            }
        );
    });

createDeviceCommand("logcat [args...]")
    .usage("[-- <args...>")
    .description("show device log (logcat --help for more)")
    .configureHelp({ showGlobalOptions: true })
    .action(async (args: string[], options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        const logcat = await adb.subprocess.spawn(`logcat ${args.join(" ")}`);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        process.on("SIGINT", async () => {
            await logcat.kill();
        });
        await logcat.stdout.pipeTo(
            new WritableStream({
                write: (chunk) => {
                    process.stdout.write(chunk);
                },
            })
        );
    });

createDeviceCommand("reboot [mode]")
    .usage("[bootloader|recovery|sideload|sideload-auto-reboot]")
    .description(
        "reboot the device; defaults to booting system image but supports bootloader and recovery too. sideload reboots into recovery and automatically starts sideload mode, sideload-auto-reboot is the same but reboots after sideloading."
    )
    .configureHelp({ showGlobalOptions: true })
    .action(async (mode: string | undefined, options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        await adb.power.reboot(mode);
    });

createDeviceCommand("usb")
    .usage(" ")
    .description("restart adbd listening on USB")
    .configureHelp({ showGlobalOptions: true })
    .action(async (options: DeviceCommandOptions) => {
        const adb = await createAdb(options);
        const output = await adb.tcpip.disable();
        process.stdout.write(output, "utf8");
    });

createDeviceCommand("tcpip port")
    .usage("port")
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
