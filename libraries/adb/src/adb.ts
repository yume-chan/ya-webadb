import type { MaybePromiseLike } from "@yume-chan/async";
import type {
    MaybeConsumable,
    ReadableWritablePair,
} from "@yume-chan/stream-extra";
import { ConcatStringStream, TextDecoderStream } from "@yume-chan/stream-extra";

import type { AdbBanner } from "./banner.js";
import type { AdbFeature } from "./features.js";
import type { AdbFrameBuffer } from "./service/index.js";
import {
    AdbPowerService,
    AdbReverseService,
    AdbSubprocessService,
    AdbSync,
    AdbTcpIpService,
    escapeArg,
    framebuffer,
} from "./service/index.js";

export interface Closeable {
    close(): MaybePromiseLike<void>;
}

export interface AdbTransport extends Closeable {
    readonly serial: string;

    readonly maxPayloadSize: number;

    readonly banner: AdbBanner;

    readonly disconnected: Promise<void>;

    readonly clientFeatures: readonly AdbFeature[];

    connect(service: string): MaybePromiseLike<Adb.Socket>;

    addReverseTunnel(
        handler: Adb.IncomingSocketHandler,
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
    readonly power: AdbPowerService;
    readonly reverse: AdbReverseService;
    readonly tcpip: AdbTcpIpService;
    readonly sync: AdbSync.Service;

    constructor(transport: AdbTransport) {
        this.#transport = transport;

        this.subprocess = new AdbSubprocessService(this);
        this.power = new AdbPowerService(this);
        this.reverse = new AdbReverseService(this);
        this.tcpip = new AdbTcpIpService(this);
        this.sync = new AdbSync.Service(this);
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
    async createSocket(service: string): Promise<Adb.Socket> {
        return this.#transport.connect(service);
    }

    async createSocketAndWait(service: string): Promise<string> {
        const socket = await this.createSocket(service);
        return await socket.readable
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(new ConcatStringStream());
    }

    async getProp(key: string): Promise<string> {
        const output = await this.subprocess.noneProtocol
            .spawn(["getprop", key])
            .wait()
            .toString();
        return output.trim();
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

        return this.subprocess.noneProtocol
            .spawn(args)
            .wait()
            .toString()
            .then((output) => output.trim());
    }

    async framebuffer(): Promise<AdbFrameBuffer> {
        return framebuffer(this);
    }

    [Symbol.asyncDispose]() {
        return this.close();
    }

    async close(): Promise<void> {
        await this.#transport.close();
    }
}

export namespace Adb {
    /**
     * Represents an ADB socket.
     */
    export interface Socket
        extends
            ReadableWritablePair<Uint8Array, MaybeConsumable<Uint8Array>>,
            Closeable {
        get service(): string;

        get closed(): Promise<undefined>;
    }

    export type IncomingSocketHandler = (
        socket: Socket,
    ) => MaybePromiseLike<void>;
}
