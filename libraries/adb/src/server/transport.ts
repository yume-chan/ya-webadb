import { PromiseResolver } from "@yume-chan/async";
import {
    AbortController,
    BufferedReadableStream,
    UnwrapConsumableStream,
    WrapWritableStream,
} from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";

import type {
    AdbIncomingSocketHandler,
    AdbSocket,
    AdbTransport,
} from "../adb.js";
import type { AdbBanner } from "../banner.js";
import { NOOP } from "../utils/index.js";

import { AdbServerClient } from "./client.js";

export class AdbServerSocketTransport implements AdbTransport {
    private _client: AdbServerClient;

    public readonly serial: string;

    public readonly transportId: number;

    public readonly maxPayloadSize: number = 1 * 1024 * 1024;

    public readonly banner: AdbBanner;

    private _closed = new PromiseResolver<void>();
    private _waitAbortController = new AbortController();
    public readonly disconnected: Promise<void>;

    public constructor(
        client: AdbServerClient,
        serial: string,
        banner: AdbBanner,
        transportId: number
    ) {
        this._client = client;
        this.serial = serial;
        this.banner = banner;
        this.transportId = transportId;

        this.disconnected = Promise.race([
            this._closed.promise,
            client.waitFor(
                { transportId },
                "disconnect",
                this._waitAbortController.signal
            ),
        ]);
    }

    public async connect(service: string): Promise<AdbSocket> {
        const connection = await this._client.connect(
            `host:transport-id:${this.transportId}`
        );

        const writer = connection.writable.getWriter();
        await AdbServerClient.writeString(writer, service);
        writer.releaseLock();

        const readable = new BufferedReadableStream(connection.readable);

        try {
            await AdbServerClient.readOkay(readable);

            return {
                service,
                readable: readable.release(),
                writable: new WrapWritableStream(
                    connection.writable
                ).bePipedThroughFrom(new UnwrapConsumableStream()),
                close() {
                    connection.readable.cancel().catch(NOOP);
                    connection.writable.abort().catch(NOOP);
                },
            };
        } finally {
            readable.cancel().catch(NOOP);
            writer.close().catch(NOOP);
        }
    }

    public async addReverseTunnel(
        address: string,
        handler: AdbIncomingSocketHandler
    ): Promise<void> {
        await this._client.connection.addReverseTunnel(address, handler);
    }

    public async removeReverseTunnel(address: string): Promise<void> {
        await this._client.connection.removeReverseTunnel(address);
    }

    public async clearReverseTunnels(): Promise<void> {
        await this._client.connection.clearReverseTunnels();
    }

    close(): ValueOrPromise<void> {
        this._closed.resolve();
        this._waitAbortController.abort();
    }
}
