import { PromiseResolver } from "@yume-chan/async";
import type {
    AbortSignal,
    ReadableWritablePair,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import {
    BufferedReadableStream,
    UnwrapConsumableStream,
    WrapWritableStream,
} from "@yume-chan/stream-extra";
import type {
    AsyncExactReadable,
    ExactReadable,
    ValueOrPromise,
} from "@yume-chan/struct";
import { SyncPromise, decodeUtf8, encodeUtf8 } from "@yume-chan/struct";

import type { AdbIncomingSocketHandler, AdbSocket } from "../adb.js";
import { AdbBanner } from "../banner.js";
import type { AdbFeature } from "../features.js";
import { NOOP } from "../utils/index.js";

import { AdbServerTransport } from "./transport.js";

function hexCharToNumber(char: number) {
    if (char < 48) {
        throw new Error(`Invalid hex char ${char}`);
    }
    if (char < 58) {
        return char - 48;
    }

    if (char < 65) {
        throw new Error(`Invalid hex char ${char}`);
    }
    if (char < 71) {
        return char - 55;
    }

    if (char < 97) {
        throw new Error(`Invalid hex char ${char}`);
    }
    if (char < 103) {
        return char - 87;
    }

    throw new Error(`Invalid hex char ${char}`);
}

function numberToHex(value: number) {
    const result = new Uint8Array(4);
    let index = 3;
    while (index >= 0 && value > 0) {
        const digit = value & 0xf;
        value >>= 4;
        if (digit < 10) {
            result[index] = digit + 48;
        } else {
            result[index] = digit + 87;
        }
        index -= 1;
    }
    while (index >= 0) {
        // '0'
        result[index] = 48;
        index -= 1;
    }
    return result;
}

export interface AdbServerConnectionOptions {
    unref?: boolean | undefined;
}

export interface AdbServerConnection {
    connect(
        options?: AdbServerConnectionOptions
    ): ValueOrPromise<ReadableWritablePair<Uint8Array, Uint8Array>>;

    addReverseTunnel(
        handler: AdbIncomingSocketHandler,
        address?: string
    ): ValueOrPromise<string>;

    removeReverseTunnel(address: string): ValueOrPromise<void>;

    clearReverseTunnels(): ValueOrPromise<void>;
}

export type AdbServerDeviceSelector =
    | {
          serial: string;
      }
    | { transportId: number }
    | { usb: true }
    | { emulator: true }
    | undefined;

export class AdbServerClient {
    public readonly connection: AdbServerConnection;

    public constructor(connection: AdbServerConnection) {
        this.connection = connection;
    }

    public static readString(stream: ExactReadable): string;
    public static readString(stream: AsyncExactReadable): PromiseLike<string>;
    public static readString(
        stream: ExactReadable | AsyncExactReadable
    ): string | PromiseLike<string> {
        return SyncPromise.try(() => stream.readExactly(4))
            .then((buffer) => {
                let length = 0;
                for (let i = 0; i < 4; i += 1) {
                    length = (length << 4) | hexCharToNumber(buffer[i]!);
                }
                return stream.readExactly(length);
            })
            .then((valueBuffer) => {
                return decodeUtf8(valueBuffer);
            })
            .valueOrPromise();
    }

    public static async writeString(
        writer: WritableStreamDefaultWriter<Uint8Array>,
        value: string
    ): Promise<void> {
        const valueBuffer = encodeUtf8(value);
        const buffer = new Uint8Array(4 + valueBuffer.length);
        buffer.set(numberToHex(valueBuffer.length));
        buffer.set(valueBuffer, 4);
        await writer.write(buffer);
    }

    public static async readOkay(
        stream: ExactReadable | AsyncExactReadable
    ): Promise<void> {
        const response = decodeUtf8(await stream.readExactly(4));
        if (response === "OKAY") {
            return;
        }

        if (response === "FAIL") {
            const reason = await AdbServerClient.readString(stream);
            throw new Error(reason);
        }

        throw new Error(`Unexpected response: ${response}`);
    }

    public async connect(
        request: string,
        options?: AdbServerConnectionOptions
    ): Promise<ReadableWritablePair<Uint8Array, Uint8Array>> {
        const connection = await this.connection.connect(options);

        const writer = connection.writable.getWriter();
        await AdbServerClient.writeString(writer, request);

        const readable = new BufferedReadableStream(connection.readable);
        try {
            await AdbServerClient.readOkay(readable);

            writer.releaseLock();
            return {
                readable: readable.release(),
                writable: connection.writable,
            };
        } catch (e) {
            writer.close().catch(NOOP);
            readable.cancel().catch(NOOP);
            throw e;
        }
    }

    public async getVersion(): Promise<string> {
        const connection = await this.connect("host:version");
        const readable = new BufferedReadableStream(connection.readable);
        try {
            const version = await AdbServerClient.readString(readable);
            connection.writable.close().catch(NOOP);
            readable.cancel().catch(NOOP);
            return version;
        } finally {
            connection.writable.close().catch(NOOP);
            readable.cancel().catch(NOOP);
        }
    }

    public async kill(): Promise<void> {
        const connection = await this.connect("host:kill");
        connection.writable.close().catch(NOOP);
        connection.readable.cancel().catch(NOOP);
    }

    public async getServerFeatures(): Promise<AdbFeature[]> {
        const connection = await this.connect("host:host-features");
        const readable = new BufferedReadableStream(connection.readable);
        try {
            const response = await AdbServerClient.readString(readable);
            return response.split(",") as AdbFeature[];
        } finally {
            connection.writable.close().catch(NOOP);
            readable.cancel().catch(NOOP);
        }
    }

    public async getDevices(): Promise<AdbServerTransport[]> {
        const connection = await this.connect("host:devices-l");
        const readable = new BufferedReadableStream(connection.readable);
        try {
            const devices: AdbServerTransport[] = [];
            const response = await AdbServerClient.readString(readable);
            for (const line of response.split("\n")) {
                if (!line) {
                    continue;
                }

                const parts = line.split(" ").filter(Boolean);
                const serial = parts[0]!;
                const status = parts[1]!;
                if (status !== "device") {
                    continue;
                }

                let product: string | undefined;
                let model: string | undefined;
                let device: string | undefined;
                let transportId: number | undefined;
                for (let i = 2; i < parts.length; i += 1) {
                    const [key, value] = parts[i]!.split(":");
                    switch (key) {
                        case "product":
                            product = value;
                            break;
                        case "model":
                            model = value;
                            break;
                        case "device":
                            device = value;
                            break;
                        case "transport_id":
                            transportId = Number.parseInt(value!, 10);
                            break;
                    }
                }
                if (!transportId) {
                    throw new Error(`No transport id for device ${serial}`);
                }
                const features = await this.getDeviceFeatures({ transportId });
                const banner = new AdbBanner(product, model, device, features);
                const transport = new AdbServerTransport(
                    this,
                    serial,
                    banner,
                    transportId
                );
                devices.push(transport);
            }
            return devices;
        } finally {
            connection.writable.close().catch(NOOP);
            readable.cancel().catch(NOOP);
        }
    }

    public formatDeviceService(
        device: AdbServerDeviceSelector,
        command: string
    ) {
        if (!device) {
            return `host:${command}`;
        }
        if ("transportId" in device) {
            return `host-transport-id:${device.transportId}:${command}`;
        }
        if ("serial" in device) {
            return `host-serial:${device.serial}:${command}`;
        }
        if ("usb" in device) {
            return `host-usb:${command}`;
        }
        if ("emulator" in device) {
            return `host-local:${command}`;
        }
        throw new Error("Invalid device selector");
    }

    public async getDeviceFeatures(
        device: AdbServerDeviceSelector
    ): Promise<AdbFeature[]> {
        const connection = await this.connect(
            this.formatDeviceService(device, "features")
        );
        const readable = new BufferedReadableStream(connection.readable);
        try {
            const response = await AdbServerClient.readString(readable);
            return response.split(",") as AdbFeature[];
        } finally {
            connection.writable.close().catch(NOOP);
            readable.cancel().catch(NOOP);
        }
    }

    public async createDeviceSocket(
        device: AdbServerDeviceSelector,
        service: string
    ): Promise<AdbSocket> {
        let switchService: string;
        if (!device) {
            switchService = `host:transport-any`;
        } else if ("transportId" in device) {
            switchService = `host:transport-id:${device.transportId}`;
        } else if ("serial" in device) {
            switchService = `host:transport:${device.serial}`;
        } else if ("usb" in device) {
            switchService = `host:transport-usb`;
        } else if ("emulator" in device) {
            switchService = `host:transport-local`;
        } else {
            throw new Error("Invalid device selector");
        }

        const connection = await this.connect(switchService);
        const readable = new BufferedReadableStream(connection.readable);
        const writer = connection.writable.getWriter();
        try {
            await AdbServerClient.writeString(writer, service);
            await AdbServerClient.readOkay(readable);

            writer.releaseLock();
            return {
                service,
                readable: readable.release(),
                writable: new WrapWritableStream(
                    connection.writable
                ).bePipedThroughFrom(new UnwrapConsumableStream()),
                close() {
                    writer.close().catch(NOOP);
                    readable.cancel().catch(NOOP);
                },
            };
        } catch (e) {
            writer.close().catch(NOOP);
            readable.cancel().catch(NOOP);
            throw e;
        }
    }

    public async waitFor(
        device: AdbServerDeviceSelector,
        state: "device" | "disconnect",
        { signal, unref }: { signal?: AbortSignal; unref?: boolean } = {}
    ): Promise<void> {
        let type: string;
        if (!device) {
            type = "any";
        } else if ("transportId" in device) {
            type = "any";
        } else if ("serial" in device) {
            type = "any";
        } else if ("usb" in device) {
            type = "usb";
        } else if ("emulator" in device) {
            type = "local";
        } else {
            throw new Error("Invalid device selector");
        }

        const service = this.formatDeviceService(
            device,
            `wait-for-${type}-${state}`
        );

        await raceSignal(() => this.connect(service, { unref }), signal);
    }
}

async function raceSignal<T>(
    callback: () => Promise<T>,
    ...signals: (AbortSignal | undefined)[]
): Promise<T> {
    const abortPromise = new PromiseResolver<never>();
    function abort(this: AbortSignal) {
        abortPromise.reject(this.reason);
    }

    try {
        for (const signal of signals) {
            if (!signal) {
                continue;
            }
            if (signal.aborted) {
                throw signal.reason;
            }
            signal.addEventListener("abort", abort);
        }

        return await Promise.race([callback(), abortPromise.promise]);
    } finally {
        for (const signal of signals) {
            if (!signal) {
                continue;
            }
            signal.removeEventListener("abort", abort);
        }
    }
}
