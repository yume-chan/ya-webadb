import { PromiseResolver } from "@yume-chan/async";

import type {
    AdbIncomingSocketHandler,
    AdbSocket,
    AdbTransport,
} from "../adb.js";
import type { AdbBanner } from "../banner.js";
import { AdbDeviceFeatures } from "../features.js";

import type { AdbServerClient } from "./client.js";

export class AdbServerTransport implements AdbTransport {
    #client: AdbServerClient;

    readonly serial: string;

    readonly transportId: bigint;

    readonly maxPayloadSize: number = 1 * 1024 * 1024;

    readonly banner: AdbBanner;

    #sockets: AdbSocket[] = [];

    #closed = new PromiseResolver<void>();
    #disconnected: Promise<void>;
    get disconnected() {
        return this.#disconnected;
    }

    get clientFeatures() {
        // This list tells the `Adb` instance how to invokes some commands.
        //
        // Because all device commands are created by `Adb` instance, not ADB server,
        // we don't need to fetch current server's feature list using `host-features` command.
        //
        // And because all server commands are created by `AdbServerClient` instance, not `Adb`,
        // we don't need to include server-only features in this list.
        return AdbDeviceFeatures;
    }

    // eslint-disable-next-line @typescript-eslint/max-params
    constructor(
        client: AdbServerClient,
        serial: string,
        banner: AdbBanner,
        transportId: bigint,
        disconnected: Promise<void>,
    ) {
        this.#client = client;
        this.serial = serial;
        this.banner = banner;
        this.transportId = transportId;

        this.#disconnected = Promise.race([this.#closed.promise, disconnected]);
    }

    async connect(service: string): Promise<AdbSocket> {
        const socket = await this.#client.createDeviceConnection(
            { transportId: this.transportId },
            service,
        );
        this.#sockets.push(socket);
        return socket;
    }

    async addReverseTunnel(
        handler: AdbIncomingSocketHandler,
        address?: string,
    ): Promise<string> {
        return await this.#client.connector.addReverseTunnel(handler, address);
    }

    async removeReverseTunnel(address: string): Promise<void> {
        await this.#client.connector.removeReverseTunnel(address);
    }

    async clearReverseTunnels(): Promise<void> {
        await this.#client.connector.clearReverseTunnels();
    }

    async close(): Promise<void> {
        for (const socket of this.#sockets) {
            await socket.close();
        }
        this.#sockets.length = 0;
        this.#closed.resolve();
    }
}
