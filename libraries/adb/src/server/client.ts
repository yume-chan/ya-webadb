// cspell:ignore tport

import { PromiseResolver } from "@yume-chan/async";
import { getUint64LittleEndian } from "@yume-chan/no-data-view";
import type {
    AbortSignal,
    ReadableWritablePair,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import {
    BufferedReadableStream,
    MaybeConsumable,
    WrapWritableStream,
} from "@yume-chan/stream-extra";
import type {
    AsyncExactReadable,
    ExactReadable,
    ValueOrPromise,
} from "@yume-chan/struct";
import {
    EMPTY_UINT8_ARRAY,
    SyncPromise,
    decodeUtf8,
    encodeUtf8,
} from "@yume-chan/struct";

import type { AdbIncomingSocketHandler, AdbSocket, Closeable } from "../adb.js";
import { AdbBanner } from "../banner.js";
import type { AdbFeature } from "../features.js";
import { NOOP, hexToNumber, write4HexDigits } from "../utils/index.js";

import { AdbServerTransport } from "./transport.js";

export interface AdbServerConnectionOptions {
    unref?: boolean | undefined;
    signal?: AbortSignal | undefined;
}

export interface AdbServerConnection
    extends ReadableWritablePair<Uint8Array, Uint8Array>,
        Closeable {
    get closed(): Promise<void>;
}

export interface AdbServerConnector {
    connect(
        options?: AdbServerConnectionOptions,
    ): ValueOrPromise<AdbServerConnection>;

    addReverseTunnel(
        handler: AdbIncomingSocketHandler,
        address?: string,
    ): ValueOrPromise<string>;

    removeReverseTunnel(address: string): ValueOrPromise<void>;

    clearReverseTunnels(): ValueOrPromise<void>;
}

export interface AdbServerSocket extends AdbSocket {
    transportId: bigint;
}

export type AdbServerDeviceSelector =
    | { transportId: bigint }
    | { serial: string }
    | { usb: true }
    | { tcp: true }
    | undefined;

export interface AdbServerDevice {
    serial: string;
    authenticating: boolean;
    product?: string | undefined;
    model?: string | undefined;
    device?: string | undefined;
    transportId: bigint;
}

function sequenceEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
}

const OKAY = encodeUtf8("OKAY");
const FAIL = encodeUtf8("FAIL");

export class AdbServerClient {
    static readonly VERSION = 41;

    readonly connection: AdbServerConnector;

    constructor(connection: AdbServerConnector) {
        this.connection = connection;
    }

    static readString(stream: ExactReadable): string;
    static readString(stream: AsyncExactReadable): PromiseLike<string>;
    static readString(
        stream: ExactReadable | AsyncExactReadable,
    ): string | PromiseLike<string> {
        return SyncPromise.try(() => stream.readExactly(4))
            .then((buffer) => {
                const length = hexToNumber(buffer);
                if (length === 0) {
                    return EMPTY_UINT8_ARRAY;
                } else {
                    return stream.readExactly(length);
                }
            })
            .then((buffer) => {
                // TODO: Investigate using stream mode `TextDecoder` for long strings.
                // Because concatenating strings uses rope data structure,
                // which only points to the original strings and doesn't copy the data,
                // it's more efficient than concatenating `Uint8Array`s.
                //
                // ```
                // const decoder = new TextDecoder();
                // let result = '';
                // for await (const chunk of stream.iterateExactly(length)) {
                //     result += decoder.decode(chunk, { stream: true });
                // }
                // result += decoder.decode();
                // return result;
                // ```
                //
                // Although, it will be super complex to use `SyncPromise` with async iterator,
                // `stream.iterateExactly` need to return an
                // `Iterator<Uint8Array | Promise<Uint8Array>>` instead of a true async iterator.
                // Maybe `SyncPromise` should support async iterators directly.
                return decodeUtf8(buffer);
            })
            .valueOrPromise();
    }

    static async writeString(
        writer: WritableStreamDefaultWriter<Uint8Array>,
        value: string,
    ): Promise<void> {
        // TODO: investigate using `encodeUtf8("0000" + value)` then modifying the length
        // That way allocates a new string (hopefully only a rope) instead of a new buffer
        const encoded = encodeUtf8(value);
        const buffer = new Uint8Array(4 + encoded.length);
        write4HexDigits(buffer, 0, encoded.length);
        buffer.set(encoded, 4);
        await writer.write(buffer);
    }

    static async readOkay(
        stream: ExactReadable | AsyncExactReadable,
    ): Promise<void> {
        const response = await stream.readExactly(4);
        if (sequenceEqual(response, OKAY)) {
            return;
        }

        if (sequenceEqual(response, FAIL)) {
            const reason = await AdbServerClient.readString(stream);
            throw new Error(reason);
        }

        throw new Error(`Unexpected response: ${decodeUtf8(response)}`);
    }

    async createConnection(
        request: string,
        options?: AdbServerConnectionOptions,
    ): Promise<AdbServerConnection> {
        const connection = await this.connection.connect(options);

        try {
            const writer = connection.writable.getWriter();
            await AdbServerClient.writeString(writer, request);
            writer.releaseLock();
        } catch (e) {
            await connection.readable.cancel();
            await connection.close();
            throw e;
        }

        const readable = new BufferedReadableStream(connection.readable);
        try {
            // `raceSignal` throws when the signal is aborted,
            // so the `catch` block can close the connection.
            await raceSignal(
                () => AdbServerClient.readOkay(readable),
                options?.signal,
            );

            return {
                readable: readable.release(),
                writable: connection.writable,
                get closed() {
                    return connection.closed;
                },
                async close() {
                    await connection.close();
                },
            };
        } catch (e) {
            await readable.cancel().catch(NOOP);
            await connection.close();
            throw e;
        }
    }

    async getVersion(): Promise<number> {
        const connection = await this.createConnection("host:version");
        const readable = new BufferedReadableStream(connection.readable);
        try {
            const length = hexToNumber(await readable.readExactly(4));
            const version = hexToNumber(await readable.readExactly(length));
            return version;
        } finally {
            connection.writable.close().catch(NOOP);
            readable.cancel().catch(NOOP);
        }
    }

    async validateVersion() {
        const version = await this.getVersion();
        if (version !== AdbServerClient.VERSION) {
            throw new Error(
                `adb server version (${version}) doesn't match this client (${AdbServerClient.VERSION})`,
            );
        }
    }

    async killServer(): Promise<void> {
        const connection = await this.createConnection("host:kill");
        connection.writable.close().catch(NOOP);
        connection.readable.cancel().catch(NOOP);
    }

    async getServerFeatures(): Promise<AdbFeature[]> {
        const connection = await this.createConnection("host:host-features");
        const readable = new BufferedReadableStream(connection.readable);
        try {
            const response = await AdbServerClient.readString(readable);
            return response.split(",") as AdbFeature[];
        } finally {
            connection.writable.close().catch(NOOP);
            readable.cancel().catch(NOOP);
        }
    }

    async pairDevice(address: string, code: string): Promise<void> {
        const connection = await this.createConnection(
            `host:pair:${code}:${address}`,
        );
        const readable = new BufferedReadableStream(connection.readable);
        try {
            const response = await readable.readExactly(4);
            // `response` is either `FAIL`, or 4 hex digits for length of the string
            if (sequenceEqual(response, FAIL)) {
                throw new Error(await AdbServerClient.readString(readable));
            }
            const length = hexToNumber(response);
            // Ignore the string because it's always `Successful ...`
            await readable.readExactly(length);
        } finally {
            connection.writable.close().catch(NOOP);
            readable.cancel().catch(NOOP);
        }
    }

    async connectDevice(address: string): Promise<void> {
        const connection = await this.createConnection(
            `host:connect:${address}`,
        );
        const readable = new BufferedReadableStream(connection.readable);
        try {
            const response = await AdbServerClient.readString(readable);
            if (response === `already connected to ${address}`) {
                throw new AdbServerClient.AlreadyConnectedError(response);
            }
            if (
                response === `failed to connect to ${address}` || // `adb pair` mode not authorized
                response === `failed to authenticate to ${address}` // `adb tcpip` mode not authorized
            ) {
                throw new AdbServerClient.UnauthorizedError(response);
            }
            if (response !== `connected to ${address}`) {
                throw new AdbServerClient.NetworkError(response);
            }
        } finally {
            connection.writable.close().catch(NOOP);
            readable.cancel().catch(NOOP);
        }
    }

    async disconnectDevice(address: string): Promise<void> {
        const connection = await this.createConnection(
            `host:disconnect:${address}`,
        );
        const readable = new BufferedReadableStream(connection.readable);
        try {
            await AdbServerClient.readString(readable);
        } finally {
            connection.writable.close().catch(NOOP);
            readable.cancel().catch(NOOP);
        }
    }

    parseDeviceList(value: string): AdbServerDevice[] {
        const devices: AdbServerDevice[] = [];
        for (const line of value.split("\n")) {
            if (!line) {
                continue;
            }

            const parts = line.split(" ").filter(Boolean);
            const serial = parts[0]!;
            const status = parts[1]!;
            if (status !== "device" && status !== "unauthorized") {
                continue;
            }

            let product: string | undefined;
            let model: string | undefined;
            let device: string | undefined;
            let transportId: bigint | undefined;
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
                        transportId = BigInt(value!);
                        break;
                }
            }
            if (!transportId) {
                throw new Error(`No transport id for device ${serial}`);
            }
            devices.push({
                serial,
                authenticating: status === "unauthorized",
                product,
                model,
                device,
                transportId,
            });
        }
        return devices;
    }

    async getDevices(): Promise<AdbServerDevice[]> {
        const connection = await this.createConnection("host:devices-l");
        const readable = new BufferedReadableStream(connection.readable);
        try {
            const response = await AdbServerClient.readString(readable);
            return this.parseDeviceList(response);
        } finally {
            connection.writable.close().catch(NOOP);
            readable.cancel().catch(NOOP);
        }
    }

    /**
     * Track the device list.
     *
     * @param signal An optional `AbortSignal` to stop tracking
     *
     * When `signal` is aborted, `trackDevices` will return normally, instead of throwing `signal.reason`.
     */
    async *trackDevices(
        signal?: AbortSignal,
    ): AsyncGenerator<AdbServerDevice[], void, void> {
        const connection = await this.createConnection("host:track-devices-l");
        const readable = new BufferedReadableStream(connection.readable);
        try {
            while (true) {
                const response = await raceSignal(
                    () => AdbServerClient.readString(readable),
                    signal,
                );
                const devices = this.parseDeviceList(response);
                yield devices;
            }
        } catch (e) {
            if (e === signal?.reason) {
                return;
            }
        } finally {
            readable.cancel().catch(NOOP);
            try {
                await connection.close();
            } catch {
                // ignore
            }
        }
    }

    formatDeviceService(device: AdbServerDeviceSelector, command: string) {
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
        if ("tcp" in device) {
            return `host-local:${command}`;
        }
        throw new Error("Invalid device selector");
    }

    async reconnectDevice(device: AdbServerDeviceSelector | "offline") {
        const connection = await this.createConnection(
            device === "offline"
                ? "host:reconnect-offline"
                : this.formatDeviceService(device, "reconnect"),
        );
        const readable = new BufferedReadableStream(connection.readable);
        try {
            const response = await AdbServerClient.readString(readable);
            return this.parseDeviceList(response);
        } finally {
            connection.writable.close().catch(NOOP);
            readable.cancel().catch(NOOP);
        }
    }

    /**
     * Gets the features supported by the device.
     * The transport ID of the selected device is also returned,
     * so the caller can execute other commands against the same device.
     * @param device The device selector
     * @returns The transport ID of the selected device, and the features supported by the device.
     */
    async getDeviceFeatures(
        device: AdbServerDeviceSelector,
    ): Promise<{ transportId: bigint; features: AdbFeature[] }> {
        // Usually the client sends a device command using `connectDevice`,
        // so the command got forwarded and handled by ADB daemon.
        // However, in fact, `connectDevice` only forwards unknown services to device,
        // if the service is a host command, it will still be handled by ADB server.
        // Also, if the command is about a device, but didn't specify a selector,
        // it will be executed against the device selected previously by `connectDevice`.
        // Using this method, we can get the transport ID and device features in one connection.
        const socket = await this.createDeviceConnection(
            device,
            "host:features",
        );
        try {
            const readable = new BufferedReadableStream(socket.readable);
            const featuresString = await AdbServerClient.readString(readable);
            const features = featuresString.split(",") as AdbFeature[];
            return { transportId: socket.transportId, features };
        } finally {
            await socket.close();
        }
    }

    /**
     * Creates a connection that will forward the service to device.
     * @param device The device selector
     * @param service The service to forward
     * @returns An `AdbServerSocket` that can be used to communicate with the service
     */
    async createDeviceConnection(
        device: AdbServerDeviceSelector,
        service: string,
    ): Promise<AdbServerSocket> {
        await this.validateVersion();

        let switchService: string;
        let transportId: bigint | undefined;
        if (!device) {
            switchService = `host:tport:any`;
        } else if ("transportId" in device) {
            switchService = `host:transport-id:${device.transportId}`;
            transportId = device.transportId;
        } else if ("serial" in device) {
            switchService = `host:tport:serial:${device.serial}`;
        } else if ("usb" in device) {
            switchService = `host:tport:usb`;
        } else if ("tcp" in device) {
            switchService = `host:tport:local`;
        } else {
            throw new Error("Invalid device selector");
        }

        const connection = await this.createConnection(switchService);

        try {
            const writer = connection.writable.getWriter();
            await AdbServerClient.writeString(writer, service);
            writer.releaseLock();
        } catch (e) {
            await connection.readable.cancel();
            await connection.close();
            throw e;
        }

        const readable = new BufferedReadableStream(connection.readable);
        try {
            if (transportId === undefined) {
                const array = await readable.readExactly(8);
                transportId = getUint64LittleEndian(array, 0);
            }

            await AdbServerClient.readOkay(readable);

            return {
                transportId,
                service,
                readable: readable.release(),
                writable: new WrapWritableStream(
                    connection.writable,
                ).bePipedThroughFrom(new MaybeConsumable.UnwrapStream()),
                get closed() {
                    return connection.closed;
                },
                async close() {
                    await connection.close();
                },
            };
        } catch (e) {
            await readable.cancel().catch(NOOP);
            await connection.close();
            throw e;
        }
    }

    /**
     * Wait for a device to be connected or disconnected.
     * @param device The device selector
     * @param state The state to wait for
     * @param options The options
     * @returns A promise that resolves when the condition is met.
     */
    async waitFor(
        device: AdbServerDeviceSelector,
        state: "device" | "disconnect",
        options?: AdbServerConnectionOptions,
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
        } else if ("tcp" in device) {
            type = "local";
        } else {
            throw new Error("Invalid device selector");
        }

        // `waitFor` can't use `connectDevice`, because the device
        // might not be available yet.
        const service = this.formatDeviceService(
            device,
            `wait-for-${type}-${state}`,
        );

        const socket = await this.createConnection(service, options);
        const readable = new BufferedReadableStream(socket.readable);
        await AdbServerClient.readOkay(readable);

        await readable.cancel();
        await socket.close();
    }

    async createTransport(
        device: AdbServerDeviceSelector,
    ): Promise<AdbServerTransport> {
        const { transportId, features } = await this.getDeviceFeatures(device);

        const devices = await this.getDevices();
        const info = devices.find(
            (device) => device.transportId === transportId,
        );

        const banner = new AdbBanner(
            info?.product,
            info?.model,
            info?.device,
            features,
        );

        return new AdbServerTransport(
            this,
            info?.serial ?? "",
            banner,
            transportId,
        );
    }
}

export async function raceSignal<T>(
    callback: () => PromiseLike<T>,
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

export namespace AdbServerClient {
    export class NetworkError extends Error {
        constructor(message: string) {
            super(message);
            this.name = "ConnectionFailedError";
        }
    }

    export class UnauthorizedError extends Error {
        constructor(message: string) {
            super(message);
            this.name = "UnauthorizedError";
        }
    }

    export class AlreadyConnectedError extends Error {
        constructor(message: string) {
            super(message);
            this.name = "AlreadyConnectedError";
        }
    }
}
