import { AdbBackend, ReadableStream, ReadableWritablePair, TransformStream, WritableStream } from '@yume-chan/adb';

/**
 * Transform an `ArrayBufferView` stream to an `ArrayBuffer` stream.
 *
 * The view must wrap the whole buffer (`byteOffset === 0` && `byteLength === buffer.byteLength`).
 */
export class ExtractViewBufferStream extends TransformStream<ArrayBufferView, ArrayBuffer>{
    constructor() {
        super({
            transform(chunk, controller) {
                controller.enqueue(chunk.buffer);
            }
        });
    }
}

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

    private _readableTransformStream: ExtractViewBufferStream;
    public get readable(): ReadableStream<ArrayBuffer> {
        return this._readableTransformStream.readable;
    }

    public get writable(): WritableStream<ArrayBuffer> {
        return this.socket.writable;
    }

    constructor(socket: TCPSocket) {
        this.socket = socket;

        // Although Direct Sockets spec didn't say,
        // WebTransport spec and File spec all have the `Uint8Array` wraps the while `ArrayBuffer`.
        this._readableTransformStream = new ExtractViewBufferStream();
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
