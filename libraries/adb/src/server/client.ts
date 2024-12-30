// cspell:ignore tport

import type { MaybePromiseLike } from "@yume-chan/async";
import { PromiseResolver } from "@yume-chan/async";
import type { Event } from "@yume-chan/event";
import { getUint64LittleEndian } from "@yume-chan/no-data-view";
import type {
    AbortSignal,
    MaybeConsumable,
    ReadableWritablePair,
} from "@yume-chan/stream-extra";
import { AbortController } from "@yume-chan/stream-extra";

import type { AdbIncomingSocketHandler, AdbSocket, Closeable } from "../adb.js";
import { AdbBanner } from "../banner.js";
import type { DeviceObserver as DeviceObserverBase } from "../device-observer.js";
import type { AdbFeature } from "../features.js";
import { hexToNumber, sequenceEqual } from "../utils/index.js";

import { AdbServerDeviceObserverOwner } from "./observer.js";
import { AdbServerStream, FAIL } from "./stream.js";
import { AdbServerTransport } from "./transport.js";

/**
 * Client for the ADB Server.
 */
export class AdbServerClient {
    static parseDeviceList(value: string): AdbServerClient.Device[] {
        const devices: AdbServerClient.Device[] = [];
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

    static formatDeviceService(
        device: AdbServerClient.DeviceSelector,
        command: string,
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
        if ("tcp" in device) {
            return `host-local:${command}`;
        }
        throw new TypeError("Invalid device selector");
    }

    readonly connector: AdbServerClient.ServerConnector;

    readonly wireless = new AdbServerClient.WirelessCommands(this);
    readonly mDns = new AdbServerClient.MDnsCommands(this);
    #observerOwner = new AdbServerDeviceObserverOwner(this);

    constructor(connector: AdbServerClient.ServerConnector) {
        this.connector = connector;
    }

    async createConnection(
        request: string,
        options?: AdbServerClient.ServerConnectionOptions,
    ): Promise<AdbServerStream> {
        const connection = await this.connector.connect(options);
        const stream = new AdbServerStream(connection);

        try {
            await stream.writeString(request);
        } catch (e) {
            await stream.dispose();
            throw e;
        }

        try {
            // `raceSignal` throws when the signal is aborted,
            // so the `catch` block can close the connection.
            await raceSignal(() => stream.readOkay(), options?.signal);
            return stream;
        } catch (e) {
            await stream.dispose();
            throw e;
        }
    }

    /**
     * `adb version`
     */
    async getVersion(): Promise<number> {
        const connection = await this.createConnection("host:version");
        try {
            const length = hexToNumber(await connection.readExactly(4));
            const version = hexToNumber(await connection.readExactly(length));
            return version;
        } finally {
            await connection.dispose();
        }
    }

    async validateVersion(minimalVersion: number) {
        const version = await this.getVersion();
        if (version < minimalVersion) {
            throw new Error(
                `adb server version (${version}) doesn't match this client (${minimalVersion})`,
            );
        }
    }

    /**
     * `adb kill-server`
     */
    async killServer(): Promise<void> {
        const connection = await this.createConnection("host:kill");
        await connection.dispose();
    }

    /**
     * `adb host-features`
     */
    async getServerFeatures(): Promise<AdbFeature[]> {
        const connection = await this.createConnection("host:host-features");
        try {
            const response = await connection.readString();
            return response.split(",") as AdbFeature[];
        } finally {
            await connection.dispose();
        }
    }

    /**
     * Get a list of connected devices from ADB Server.
     *
     * Equivalent ADB Command: `adb devices -l`
     */
    async getDevices(): Promise<AdbServerClient.Device[]> {
        const connection = await this.createConnection("host:devices-l");
        try {
            const response = await connection.readString();
            return AdbServerClient.parseDeviceList(response);
        } finally {
            await connection.dispose();
        }
    }

    /**
     * Monitors device list changes.
     */
    async trackDevices(
        options?: AdbServerClient.ServerConnectionOptions,
    ): Promise<AdbServerClient.DeviceObserver> {
        return this.#observerOwner.createObserver(options);
    }

    /**
     * `adb -s <device> reconnect` or `adb reconnect offline`
     */
    async reconnectDevice(device: AdbServerClient.DeviceSelector | "offline") {
        const connection = await this.createConnection(
            device === "offline"
                ? "host:reconnect-offline"
                : AdbServerClient.formatDeviceService(device, "reconnect"),
        );
        try {
            await connection.readString();
        } finally {
            await connection.dispose();
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
        device: AdbServerClient.DeviceSelector,
    ): Promise<{ transportId: bigint; features: AdbFeature[] }> {
        // On paper, `host:features` is a host service (device features are cached in host),
        // so it shouldn't use `createDeviceConnection`,
        // which is used to forward the service to the device.
        //
        // However, `createDeviceConnection` is a two step process:
        //
        //    1. Send a switch device service to host, to switch the connection to the device.
        //    2. Send the actual service to host, let it forward the service to the device.
        //
        // In step 2, the host only forward the service to device if the service is unknown to host.
        // If the service is a host service, it's still handled by host.
        //
        // Even better, if the service needs a device selector, but the selector is not provided,
        // the service will be executed against the device selected by the switch device service.
        // So we can use all device selector formats for the host service,
        // and get the transport ID in the same time.
        const connection = await this.createDeviceConnection(
            device,
            "host:features",
        );
        // Luckily `AdbServerClient.Socket` is compatible with `AdbServerClient.ServerConnection`
        const stream = new AdbServerStream(connection);
        try {
            const featuresString = await stream.readString();
            const features = featuresString.split(",") as AdbFeature[];
            return { transportId: connection.transportId, features };
        } finally {
            await stream.dispose();
        }
    }

    /**
     * Creates a connection that will forward the service to device.
     * @param device The device selector
     * @param service The service to forward
     * @returns An `AdbServerClient.Socket` that can be used to communicate with the service
     */
    async createDeviceConnection(
        device: AdbServerClient.DeviceSelector,
        service: string,
    ): Promise<AdbServerClient.Socket> {
        let switchService: string;
        let transportId: bigint | undefined;
        if (!device) {
            await this.validateVersion(41);
            switchService = `host:tport:any`;
        } else if ("transportId" in device) {
            switchService = `host:transport-id:${device.transportId}`;
            transportId = device.transportId;
        } else if ("serial" in device) {
            await this.validateVersion(41);
            switchService = `host:tport:serial:${device.serial}`;
        } else if ("usb" in device) {
            await this.validateVersion(41);
            switchService = `host:tport:usb`;
        } else if ("tcp" in device) {
            await this.validateVersion(41);
            switchService = `host:tport:local`;
        } else {
            throw new TypeError("Invalid device selector");
        }

        const connection = await this.createConnection(switchService);

        try {
            await connection.writeString(service);
        } catch (e) {
            await connection.dispose();
            throw e;
        }

        try {
            if (transportId === undefined) {
                const array = await connection.readExactly(8);
                transportId = getUint64LittleEndian(array, 0);
            }

            await connection.readOkay();

            const socket = connection.release();

            return {
                transportId,
                service,
                readable: socket.readable,
                writable: socket.writable,
                get closed() {
                    return socket.closed;
                },
                async close() {
                    await socket.close();
                },
            };
        } catch (e) {
            await connection.dispose();
            throw e;
        }
    }
    async #waitForUnchecked(
        device: AdbServerClient.DeviceSelector,
        state: "device" | "disconnect",
        options?: AdbServerClient.ServerConnectionOptions,
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
            throw new TypeError("Invalid device selector");
        }

        // `waitFor` can't use `connectDevice`, because the device
        // might not be available yet.
        const service = AdbServerClient.formatDeviceService(
            device,
            `wait-for-${type}-${state}`,
        );

        const connection = await this.createConnection(service, options);
        try {
            await connection.readOkay();
        } finally {
            await connection.dispose();
        }
    }

    /**
     * Wait for a device to be connected or disconnected.
     *
     * `adb wait-for-<state>`
     *
     * @param device The device selector
     * @param state The state to wait for
     * @param options The options
     * @returns A promise that resolves when the condition is met.
     */
    async waitFor(
        device: AdbServerClient.DeviceSelector,
        state: "device" | "disconnect",
        options?: AdbServerClient.ServerConnectionOptions,
    ): Promise<void> {
        if (state === "disconnect") {
            await this.validateVersion(41);
        }

        return this.#waitForUnchecked(device, state, options);
    }

    async waitForDisconnect(
        transportId: bigint,
        options?: AdbServerClient.ServerConnectionOptions,
    ): Promise<void> {
        const serverVersion = await this.getVersion();
        if (serverVersion >= 41) {
            return this.#waitForUnchecked(
                { transportId },
                "disconnect",
                options,
            );
        } else {
            const observer = await this.trackDevices(options);
            return new Promise<void>((resolve, reject) => {
                observer.onDeviceRemove((devices) => {
                    if (
                        devices.some(
                            (device) => device.transportId === transportId,
                        )
                    ) {
                        observer.stop();
                        resolve();
                    }
                });
                observer.onError((e) => {
                    observer.stop();
                    reject(e);
                });
            });
        }
    }

    /**
     * Creates an ADB Transport for the specified device.
     */
    async createTransport(
        device: AdbServerClient.DeviceSelector,
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

        const waitAbortController = new AbortController();
        const disconnected = this.waitForDisconnect(transportId, {
            unref: true,
            signal: waitAbortController.signal,
        });

        const transport = new AdbServerTransport(
            this,
            info?.serial ?? "",
            banner,
            transportId,
            disconnected,
        );

        transport.disconnected.then(
            () => waitAbortController.abort(),
            () => waitAbortController.abort(),
        );

        return transport;
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
    export interface ServerConnectionOptions {
        unref?: boolean | undefined;
        signal?: AbortSignal | undefined;
    }

    export interface ServerConnection
        extends ReadableWritablePair<Uint8Array, MaybeConsumable<Uint8Array>>,
            Closeable {
        get closed(): Promise<void>;
    }

    export interface ServerConnector {
        connect(
            options?: ServerConnectionOptions,
        ): MaybePromiseLike<ServerConnection>;

        addReverseTunnel(
            handler: AdbIncomingSocketHandler,
            address?: string,
        ): MaybePromiseLike<string>;

        removeReverseTunnel(address: string): MaybePromiseLike<void>;

        clearReverseTunnels(): MaybePromiseLike<void>;
    }

    export interface Socket extends AdbSocket {
        transportId: bigint;
    }

    /**
     * A union type for selecting a device.
     */
    export type DeviceSelector =
        | { transportId: bigint }
        | { serial: string }
        | { usb: true }
        | { tcp: true }
        | undefined;

    export interface Device {
        serial: string;
        authenticating: boolean;
        product?: string | undefined;
        model?: string | undefined;
        device?: string | undefined;
        transportId: bigint;
    }

    export class NetworkError extends Error {
        constructor(message: string) {
            super(message);
            this.name = "NetworkError";
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

    export class WirelessCommands {
        #client: AdbServerClient;

        constructor(client: AdbServerClient) {
            this.#client = client;
        }

        /**
         * `adb pair <password> <address>`
         */
        async pair(address: string, password: string): Promise<void> {
            const connection = await this.#client.createConnection(
                `host:pair:${password}:${address}`,
            );
            try {
                const response = await connection.readExactly(4);
                // `response` is either `FAIL`, or 4 hex digits for length of the string
                if (sequenceEqual(response, FAIL)) {
                    throw new Error(await connection.readString());
                }
                const length = hexToNumber(response);
                // Ignore the string as it's always `Successful ...`
                await connection.readExactly(length);
            } finally {
                await connection.dispose();
            }
        }

        /**
         * `adb connect <address>`
         */
        async connect(address: string): Promise<void> {
            const connection = await this.#client.createConnection(
                `host:connect:${address}`,
            );
            try {
                const response = await connection.readString();
                switch (response) {
                    case `already connected to ${address}`:
                        throw new AdbServerClient.AlreadyConnectedError(
                            response,
                        );
                    case `failed to connect to ${address}`: // `adb pair` mode not authorized
                    case `failed to authenticate to ${address}`: // `adb tcpip` mode not authorized
                        throw new AdbServerClient.UnauthorizedError(response);
                    case `connected to ${address}`:
                        return;
                    default:
                        throw new AdbServerClient.NetworkError(response);
                }
            } finally {
                await connection.dispose();
            }
        }

        /**
         * `adb disconnect <address>`
         */
        async disconnect(address: string): Promise<void> {
            const connection = await this.#client.createConnection(
                `host:disconnect:${address}`,
            );
            try {
                await connection.readString();
            } finally {
                await connection.dispose();
            }
        }
    }

    export class MDnsCommands {
        #client: AdbServerClient;

        constructor(client: AdbServerClient) {
            this.#client = client;
        }

        async check() {
            const connection =
                await this.#client.createConnection("host:mdns:check");
            try {
                const response = await connection.readString();
                return !response.startsWith("ERROR:");
            } finally {
                await connection.dispose();
            }
        }

        async getServices() {
            const connection =
                await this.#client.createConnection("host:mdns:services");
            try {
                const response = await connection.readString();
                return response
                    .split("\n")
                    .filter(Boolean)
                    .map((line) => {
                        const parts = line.split("\t");
                        return {
                            name: parts[0]!,
                            service: parts[1]!,
                            address: parts[2]!,
                        };
                    });
            } finally {
                await connection.dispose();
            }
        }
    }

    export interface DeviceObserver extends DeviceObserverBase<Device> {
        onError: Event<Error>;
    }
}
