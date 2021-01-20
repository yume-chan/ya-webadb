import { AdbBackend, BufferedStream, decodeBase64, encodeBase64, EventQueue, Stream } from '@yume-chan/adb';
import { PromiseResolver } from '@yume-chan/async-operation-manager';
import { EventEmitter } from '@yume-chan/event';

const PrivateKeyStorageKey = 'private-key';

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
            this.disconnectEvent.fire();
        };

        this.socket = socket;
        this.bufferedStream = new BufferedStream({
            read() { return queue.dequeue(); },
        });
    }

    public *iterateKeys(): Generator<ArrayBuffer, void, void> {
        const privateKey = window.localStorage.getItem(PrivateKeyStorageKey);
        if (privateKey) {
            yield decodeBase64(privateKey);
        }
    }

    public async generateKey(): Promise<ArrayBuffer> {
        const { privateKey: cryptoKey } = await crypto.subtle.generateKey(
            {
                name: 'RSASSA-PKCS1-v1_5',
                modulusLength: 2048,
                // 65537
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: 'SHA-1',
            },
            true,
            ['sign', 'verify']
        );

        const privateKey = await crypto.subtle.exportKey('pkcs8', cryptoKey);
        window.localStorage.setItem(PrivateKeyStorageKey, decodeUtf8(encodeBase64(privateKey)));
        return privateKey;
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
