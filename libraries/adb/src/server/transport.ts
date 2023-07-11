import { PromiseResolver } from "@yume-chan/async";
import { AbortController } from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";

import type {
    AdbIncomingSocketHandler,
    AdbSocket,
    AdbTransport,
} from "../adb.js";
import type { AdbBanner } from "../banner.js";

import type { AdbServerClient } from "./client.js";

export class AdbServerTransport implements AdbTransport {
    #client: AdbServerClient;

    readonly serial: string;

    readonly transportId: bigint;

    readonly maxPayloadSize: number = 1 * 1024 * 1024;

    readonly banner: AdbBanner;

    #closed = new PromiseResolver<void>();
    #waitAbortController = new AbortController();
    readonly disconnected: Promise<void>;

    constructor(
        client: AdbServerClient,
        serial: string,
        banner: AdbBanner,
        transportId: bigint,
    ) {
        this.#client = client;
        this.serial = serial;
        this.banner = banner;
        this.transportId = transportId;

        this.disconnected = Promise.race([
            this.#closed.promise,
            client.waitFor({ transportId }, "disconnect", {
                signal: this.#waitAbortController.signal,
                unref: true,
            }),
        ]);
    }

    async connect(service: string): Promise<AdbSocket> {
        return await this.#client.connectDevice(
            {
                transportId: this.transportId,
            },
            service,
        );
    }

    async addReverseTunnel(
        handler: AdbIncomingSocketHandler,
        address?: string,
    ): Promise<string> {
        return await this.#client.connection.addReverseTunnel(handler, address);
    }

    async removeReverseTunnel(address: string): Promise<void> {
        await this.#client.connection.removeReverseTunnel(address);
    }

    async clearReverseTunnels(): Promise<void> {
        await this.#client.connection.clearReverseTunnels();
    }

    close(): ValueOrPromise<void> {
        this.#closed.resolve();
        this.#waitAbortController.abort();
    }
}
