import { AdbBackend, BufferedStream, decodeBase64, encodeBase64, EventQueue, Stream } from '@yume-chan/adb';
import { PromiseResolver } from '@yume-chan/async';
import { EventEmitter } from '@yume-chan/event';

const Utf8Encoder = new TextEncoder();
const Utf8Decoder = new TextDecoder();

export function encodeUtf8(input: string): ArrayBuffer {
    return Utf8Encoder.encode(input).buffer;
}

export function decodeUtf8(buffer: ArrayBuffer): string {
    return Utf8Decoder.decode(buffer);
}

export default class AdbWsBackend implements AdbBackend {
    public readonly serial: string;

    public name: string | undefined;

    private socket: WebSocket | undefined;

    private bufferedStream: BufferedStream<Stream> | undefined;

    private _connected = false;
    public get connected() { return this._connected; }

    private readonly disconnectEvent = new EventEmitter<void>();
    public readonly onDisconnected = this.disconnectEvent.event;

    public constructor(url: string, name?: string) {
        this.serial = url;
        this.name = name;
    }

    public async connect() {
        const socket = new WebSocket(this.serial);
        socket.binaryType = "arraybuffer";

        const resolver = new PromiseResolver();
        socket.onopen = resolver.resolve;
        socket.onerror = () => {
            resolver.reject(new Error('WebSocket connect failed'));
        };
        await resolver.promise;

        const queue = new EventQueue<ArrayBuffer>();
        socket.onmessage = ({ data }: { data: ArrayBuffer; }) => {
            queue.enqueue(data, data.byteLength);
        };
        socket.onclose = () => {
            queue.end();
            this._connected = false;
            this.disconnectEvent.fire();
        };

        this.socket = socket;
        this.bufferedStream = new BufferedStream({
            read() { return queue.dequeue(); },
        });
        this._connected = true;
    }

    public encodeUtf8(input: string): ArrayBuffer {
        return encodeUtf8(input);
    }

    public decodeUtf8(buffer: ArrayBuffer): string {
        return decodeUtf8(buffer);
    }

    public write(buffer: ArrayBuffer): void | Promise<void> {
        this.socket?.send(buffer);
    }

    public read(length: number): ArrayBuffer | Promise<ArrayBuffer> {
        return this.bufferedStream!.read(length);
    }

    public dispose(): void | Promise<void> {
        this.socket?.close();
    }
}
