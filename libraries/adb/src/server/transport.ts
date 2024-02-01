import { PromiseResolver } from "@yume-chan/async";
import { AbortController } from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";

import type {
    AdbIncomingSocketHandler,
    AdbSocket,
    AdbTransport,
} from "../adb.js";
import type { AdbBanner } from "../banner.js";
import { AdbFeature } from "../features.js";

import type { AdbServerClient } from "./client.js";

export const ADB_SERVER_DEFAULT_FEATURES = [
    AdbFeature.ShellV2,
    AdbFeature.Cmd,
    AdbFeature.StatV2,
    AdbFeature.ListV2,
    AdbFeature.FixedPushMkdir,
    "apex",
    AdbFeature.Abb,
    // only tells the client the symlink timestamp issue in `adb push --sync` has been fixed.
    // No special handling required.
    "fixed_push_symlink_timestamp",
    AdbFeature.AbbExec,
    "remount_shell",
    "track_app",
    AdbFeature.SendReceiveV2,
    "sendrecv_v2_brotli",
    "sendrecv_v2_lz4",
    "sendrecv_v2_zstd",
    "sendrecv_v2_dry_run_send",
] as AdbFeature[];

export class AdbServerTransport implements AdbTransport {
    #client: AdbServerClient;

    readonly serial: string;

    readonly transportId: bigint;

    readonly maxPayloadSize: number = 1 * 1024 * 1024;

    readonly banner: AdbBanner;

    #closed = new PromiseResolver<void>();
    #waitAbortController = new AbortController();
    readonly disconnected: Promise<void>;

    get clientFeatures() {
        // No need to get host features (features supported by ADB server)
        // Because we create all ADB packets ourselves
        return ADB_SERVER_DEFAULT_FEATURES;
    }

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
