import { AdbBackend, BufferedStream, Stream } from '@yume-chan/adb';
import { EventEmitter } from '@yume-chan/event';

const Utf8Encoder = new TextEncoder();
const Utf8Decoder = new TextDecoder();

declare global {
    interface TCPSocket {
        close(): Promise<void>;

        readonly remoteAddress: string;
        readonly remotePort: number;
        readonly readable: ReadableStream;
        readonly writable: WritableStream;
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

export function encodeUtf8(input: string): ArrayBuffer {
    return Utf8Encoder.encode(input).buffer;
}

export function decodeUtf8(buffer: ArrayBuffer): string {
    return Utf8Decoder.decode(buffer);
}

export default class AdbDirectSocketsBackend implements AdbBackend {
    public static isSupported(): boolean {
        return typeof window !== 'undefined' && !!window.navigator?.openTCPSocket;
    }

    public readonly serial: string;

    public readonly address: string;

    public readonly port: number;

    public name: string | undefined;

    private socket: TCPSocket | undefined;
    private reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    private bufferedStream: BufferedStream<Stream> | undefined;
    private writer: WritableStreamDefaultWriter<Uint8Array> | undefined;

    private _connected = false;
    public get connected() { return this._connected; }

    private readonly disconnectEvent = new EventEmitter<void>();
    public readonly onDisconnected = this.disconnectEvent.event;

    public constructor(address: string, port: number = 5555, name?: string) {
        this.address = address;
        this.port = port;
        this.serial = `${address}:${port}`;
        this.name = name;
    }

    public async connect() {
        const socket = await navigator.openTCPSocket({
            remoteAddress: this.address,
            remotePort: this.port,
            noDelay: true,
        });

        this.socket = socket;
        this.reader = this.socket.readable.getReader();
        this.bufferedStream = new BufferedStream({
            read: async () => {
                const result = await this.reader!.read();
                if (result.value) {
                    return result.value.buffer;
                }
                throw new Error('Stream ended');
            }
        });
        this.writer = this.socket.writable.getWriter();

        this._connected = true;
    }

    public encodeUtf8(input: string): ArrayBuffer {
        return encodeUtf8(input);
    }

    public decodeUtf8(buffer: ArrayBuffer): string {
        return decodeUtf8(buffer);
    }

    public write(buffer: ArrayBuffer): Promise<void> {
        return this.writer!.write(new Uint8Array(buffer));
    }

    public async read(length: number): Promise<ArrayBuffer> {
        return this.bufferedStream!.read(length);
    }

    public dispose(): void | Promise<void> {
        this.socket?.close();
    }
}
