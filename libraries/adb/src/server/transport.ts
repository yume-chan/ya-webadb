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
            client.waitFor({ transportId }, "disconnect", {
                signal: this._waitAbortController.signal,
                unref: true,
            }),
        ]);
    }

    public async connect(service: string): Promise<AdbSocket> {
        return await this._client.createDeviceSocket(
            {
                transportId: this.transportId,
            },
            service
        );
    }

    public async addReverseTunnel(
        handler: AdbIncomingSocketHandler,
        address?: string
    ): Promise<string> {
        return await this._client.connection.addReverseTunnel(handler, address);
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
