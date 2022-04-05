import { AdbBackend, AdbPacket, AdbPacketSerializeStream, pipeFrom, ReadableStream, StructDeserializeStream, WrapReadableStream, WrapWritableStream, WritableStream } from '@yume-chan/adb';

declare global {
    interface TCPSocket {
        close(): Promise<void>;

        readonly remoteAddress: string;
        readonly remotePort: number;
        readonly readable: ReadableStream<Uint8Array>;
        readonly writable: WritableStream<BufferSource>;
    }

    interface SocketOptions {
        localAddress?: string | undefined;
        localPort?: number | undefined;

        remoteAddress: string;
        remotePort: number;

        sendBufferSize?: number;
        receiveBufferSize?: number;

        keepAlive?: number;
        noDelay?: boolean;
    }

    interface Navigator {
        openTCPSocket(options?: SocketOptions): Promise<TCPSocket>;
    }
}

export default class AdbDirectSocketsBackend implements AdbBackend {
    public static isSupported(): boolean {
        return typeof window !== 'undefined' && !!window.navigator?.openTCPSocket;
    }

    public readonly serial: string;

    public readonly host: string;

    public readonly port: number;

    public name: string | undefined;

    public constructor(host: string, port: number = 5555, name?: string) {
        this.host = host;
        this.port = port;
        this.serial = `${host}:${port}`;
        this.name = name;
    }

    public async connect() {
        const { readable, writable } = await navigator.openTCPSocket({
            remoteAddress: this.host,
            remotePort: this.port,
            noDelay: true,
        });

        // Native streams can't `pipeTo()` or `pipeThrough()` polyfilled streams, so we need to wrap them
        return {
            readable: new WrapReadableStream(readable)
                .pipeThrough(new StructDeserializeStream(AdbPacket)),
            writable: pipeFrom(
                new WrapWritableStream(writable),
                new AdbPacketSerializeStream()
            ),
        };
    }
}
