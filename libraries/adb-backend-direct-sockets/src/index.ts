import { AdbBackend, ReadableStream, ReadableWritablePair, TransformStream, WritableStream } from '@yume-chan/adb';

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

export class AdbDirectSocketsBackendStreams implements ReadableWritablePair<ArrayBuffer, ArrayBuffer>{
    private socket: TCPSocket;

    private _readableTransformStream = new TransformStream<Uint8Array, ArrayBuffer>({
        transform(chunk, controller) {
            // Although spec didn't say,
            // the chunk always has `byteOffset` of 0 and `byteLength` same as its buffer
            controller.enqueue(chunk.buffer);
        },
    });
    public get readable(): ReadableStream<ArrayBuffer> {
        return this._readableTransformStream.readable;
    }

    public get writable(): WritableStream<ArrayBuffer> {
        return this.socket.writable;
    }

    constructor(socket: TCPSocket) {
        this.socket = socket;
        this.socket.readable.pipeTo(this._readableTransformStream.writable);
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
        const socket = await navigator.openTCPSocket({
            remoteAddress: this.host,
            remotePort: this.port,
            noDelay: true,
        });

        return new AdbDirectSocketsBackendStreams(socket);
    }
}
