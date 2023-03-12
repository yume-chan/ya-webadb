import type { AdbBackend } from "@yume-chan/adb";
import { AdbPacket, AdbPacketSerializeStream } from "@yume-chan/adb";
import type { ReadableStream, WritableStream } from "@yume-chan/stream-extra";
import {
    StructDeserializeStream,
    UnwrapConsumableStream,
    WrapReadableStream,
    WrapWritableStream,
} from "@yume-chan/stream-extra";

declare global {
    interface TCPSocketOpenInfo {
        readable: ReadableStream<Uint8Array>;
        writable: WritableStream<Uint8Array>;

        remoteAddress: string;
        remotePort: number;

        localAddress: string;
        localPort: number;
    }

    class TCPSocket {
        constructor(
            remoteAddress: string,
            remotePort: number,
            options?: TCPSocketOptions
        );

        opened: Promise<TCPSocketOpenInfo>;
        closed: Promise<void>;

        close(): Promise<void>;
    }

    interface TCPSocketOptions {
        sendBufferSize?: number;
        receiveBufferSize?: number;

        noDelay?: boolean;
        keepAliveDelay?: number;
    }

    interface Window {
        TCPSocket: typeof TCPSocket;
    }
}

export default class AdbDirectSocketsBackend implements AdbBackend {
    public static isSupported(): boolean {
        return typeof window !== "undefined" && !!window.TCPSocket;
    }

    public readonly serial: string;

    public readonly host: string;

    public readonly port: number;

    public name: string | undefined;

    public constructor(host: string, port = 5555, name?: string) {
        this.host = host;
        this.port = port;
        this.serial = `${host}:${port}`;
        this.name = name;
    }

    public async connect() {
        const socket = new TCPSocket(this.host, this.port, { noDelay: true });
        const { readable, writable } = await socket.opened;

        return {
            readable: new WrapReadableStream(readable).pipeThrough(
                new StructDeserializeStream(AdbPacket)
            ),
            writable: new WrapWritableStream(writable)
                .bePipedThroughFrom(new UnwrapConsumableStream())
                .bePipedThroughFrom(new AdbPacketSerializeStream()),
        };
    }
}
