import type { MaybePromiseLike } from "@yume-chan/async";
import type {
    MaybeConsumable,
    ReadableWritablePair,
} from "@yume-chan/stream-extra";
import { ConcatStringStream, TextDecoderStream } from "@yume-chan/stream-extra";

import type { AdbBanner } from "./banner.js";
import type { AdbFrameBuffer } from "./commands/index.js";
import {
    AdbPower,
    AdbReverseService,
    AdbSubprocessService,
    AdbSync,
    AdbTcpIpService,
    escapeArg,
    framebuffer,
} from "./commands/index.js";
import type { AdbFeature } from "./features.js";

export interface Closeable {
    close(): MaybePromiseLike<void>;
}

/**
 * Represents an ADB socket.
 */
export interface AdbSocket
    extends ReadableWritablePair<Uint8Array, MaybeConsumable<Uint8Array>>,
        Closeable {
    get service(): string;

    get closed(): Promise<undefined>;
}

export type AdbIncomingSocketHandler = (
    socket: AdbSocket,
) => MaybePromiseLike<void>;

export interface AdbTransport extends Closeable {
    readonly serial: string;

    readonly maxPayloadSize: number;

    readonly banner: AdbBanner;

    readonly disconnected: Promise<void>;

    readonly clientFeatures: readonly AdbFeature[];

    connect(service: string): MaybePromiseLike<AdbSocket>;

    addReverseTunnel(
        handler: AdbIncomingSocketHandler,
        address?: string,
    ): MaybePromiseLike<string>;

    removeReverseTunnel(address: string): MaybePromiseLike<void>;

    clearReverseTunnels(): MaybePromiseLike<void>;
}

export class Adb implements Closeable {
    readonly #transport: AdbTransport;
    get transport(): AdbTransport {
        return this.#transport;
    }

    get serial() {
        return this.#transport.serial;
    }

    get maxPayloadSize() {
        return this.#transport.maxPayloadSize;
    }

    get banner() {
        return this.#transport.banner;
    }

    get disconnected() {
        return this.#transport.disconnected;
    }

    public get clientFeatures() {
        return this.#transport.clientFeatures;
    }

    public get deviceFeatures() {
        return this.banner.features;
    }

    readonly subprocess: AdbSubprocessService;
    readonly power: AdbPower;
    readonly reverse: AdbReverseService;
    readonly tcpip: AdbTcpIpService;

    constructor(transport: AdbTransport) {
        this.#transport = transport;

        this.subprocess = new AdbSubprocessService(this);
        this.power = new AdbPower(this);
        this.reverse = new AdbReverseService(this);
        this.tcpip = new AdbTcpIpService(this);
    }

    canUseFeature(feature: AdbFeature): boolean {
        return (
            this.clientFeatures.includes(feature) &&
            this.deviceFeatures.includes(feature)
        );
    }

    /**
     * Creates a new ADB Socket to the specified service or socket address.
     */
    async createSocket(service: string): Promise<AdbSocket> {
        return this.#transport.connect(service);
    }

    async createSocketAndWait(service: string): Promise<string> {
        const socket = await this.createSocket(service);
        return await socket.readable
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(new ConcatStringStream());
    }

    getProp(key: string): Promise<string> {
        return this.subprocess.noneProtocol
            .spawnWaitText(["getprop", key])
            .then((output) => output.trim());
    }

    rm(
        filenames: string | readonly string[],
        options?: { recursive?: boolean; force?: boolean },
    ): Promise<string> {
        const args = ["rm"];
        if (options?.recursive) {
            args.push("-r");
        }
        if (options?.force) {
            args.push("-f");
        }
        if (Array.isArray(filenames)) {
            for (const filename of filenames) {
                // https://github.com/microsoft/typescript/issues/17002
                args.push(escapeArg(filename as string));
            }
        } else {
            // https://github.com/microsoft/typescript/issues/17002
            args.push(escapeArg(filenames as string));
        }
        // https://android.googlesource.com/platform/packages/modules/adb/+/1a0fb8846d4e6b671c8aa7f137a8c21d7b248716/client/adb_install.cpp#984
        args.push("</dev/null");

        return this.subprocess.noneProtocol.spawnWaitText(args);
    }

    async sync(): Promise<AdbSync> {
        const socket = await this.createSocket("sync:");
        return new AdbSync(this, socket);
    }

    async framebuffer(): Promise<AdbFrameBuffer> {
        return framebuffer(this);
    }

    async close(): Promise<void> {
        await this.#transport.close();
    }
}
