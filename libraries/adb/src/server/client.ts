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
import { Adb } from "../adb.js";
import { AdbBanner } from "../banner.js";
import type { DeviceObserver as DeviceObserverBase } from "../device-observer.js";
import type { AdbFeature } from "../features.js";
import { hexToNumber } from "../utils/index.js";

import {
    MDnsCommands,
    WirelessCommands,
    AlreadyConnectedError as _AlreadyConnectedError,
    NetworkError as _NetworkError,
    UnauthorizedError as _UnauthorizedError,
} from "./commands/index.js";
import { AdbServerDeviceObserverOwner } from "./observer.js";
import { AdbServerStream } from "./stream.js";
import { AdbServerTransport } from "./transport.js";

/**
 * Client for the ADB Server.
 */
export class AdbServerClient {
    static NetworkError = _NetworkError;
    static UnauthorizedError = _UnauthorizedError;
    static AlreadyConnectedError = _AlreadyConnectedError;

    static parseDeviceList(
        value: string,
        includeStates: readonly AdbServerClient.ConnectionState[] = [
            "device",
            "unauthorized",
        ],
    ): AdbServerClient.Device[] {
        const devices: AdbServerClient.Device[] = [];
        for (const line of value.split("\n")) {
            if (!line) {
                continue;
            }

            const parts = line.split(" ").filter(Boolean);
            const serial = parts[0]!;
            const state = parts[1]! as AdbServerClient.ConnectionState;
            if (!includeStates.includes(state)) {
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
                state,
                authenticating: state === "unauthorized",
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

    readonly wireless = new WirelessCommands(this);
    readonly mDns = new MDnsCommands(this);
    readonly #observerOwner = new AdbServerDeviceObserverOwner(this);

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
    async getDevices(
        includeStates: readonly AdbServerClient.ConnectionState[] = [
            "device",
            "unauthorized",
        ],
    ): Promise<AdbServerClient.Device[]> {
        const connection = await this.createConnection("host:devices-l");
        try {
            const response = await connection.readString();
            return AdbServerClient.parseDeviceList(response, includeStates);
        } finally {
            await connection.dispose();
        }
    }

    /**
     * Monitors device list changes.
     */
    async trackDevices(
        options?: AdbServerDeviceObserverOwner.Options,
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
    ): Promise<{ transportId: bigint; features: readonly AdbFeature[] }> {
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

        void transport.disconnected.finally(() => waitAbortController.abort());

        return transport;
    }

    async createAdb(device: AdbServerClient.DeviceSelector) {
        const transport = await this.createTransport(device);
        return new Adb(transport);
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
        get closed(): Promise<undefined>;
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

    export type ConnectionState = "unauthorized" | "offline" | "device";

    export interface Device {
        serial: string;
        state: ConnectionState;
        /** @deprecated Use {@link state} instead */
        authenticating: boolean;
        product?: string | undefined;
        model?: string | undefined;
        device?: string | undefined;
        transportId: bigint;
    }

    export interface DeviceObserver extends DeviceObserverBase<Device> {
        onError: Event<Error>;
    }

    export type NetworkError = _NetworkError;
    export type UnauthorizedError = _UnauthorizedError;
    export type AlreadyConnectedError = _AlreadyConnectedError;
}
