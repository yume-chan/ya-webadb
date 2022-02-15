import { AdbBackend, ReadableStream, WritableStream } from '@yume-chan/adb';
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

    private _readable: ReadableStream<ArrayBuffer> | undefined;
    public get readable() { return this._readable; }

    private _writable: WritableStream<ArrayBuffer> | undefined;
    public get writable() { return this._writable; }

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

        this._readable = new ReadableStream({
            start: (controller) => {
                socket.onmessage = ({ data }: { data: ArrayBuffer; }) => {
                    controller.enqueue(data);
                };
                socket.onclose = () => {
                    controller.close();
                    this._connected = false;
                    this.disconnectEvent.fire();
                };
            }
        }, {
            highWaterMark: 16 * 1024,
            size(chunk) { return chunk.byteLength; },
        });
        this._writable = new WritableStream({
            write: (chunk) => {
                socket.send(chunk);
            },
        }, {
            highWaterMark: 16 * 1024,
            size(chunk) { return chunk.byteLength; },
        });

        this.socket = socket;
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

    public dispose(): void | Promise<void> {
        this.socket?.close();
    }
}
