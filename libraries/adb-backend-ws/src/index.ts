import { AdbBackend, ReadableStream, WritableStream } from '@yume-chan/adb';

export default class AdbWsBackend implements AdbBackend {
    public readonly serial: string;

    public name: string | undefined;

    public constructor(url: string, name?: string) {
        this.serial = url;
        this.name = name;
    }

    public async connect() {
        const socket = new WebSocket(this.serial);
        socket.binaryType = "arraybuffer";

        await new Promise((resolve, reject) => {
            socket.onopen = resolve;
            socket.onerror = () => {
                reject(new Error('WebSocket connect failed'));
            };
        });

        const readable = new ReadableStream<Uint8Array>({
            start: (controller) => {
                socket.onmessage = ({ data }: { data: ArrayBuffer; }) => {
                    controller.enqueue(new Uint8Array(data));
                };
                socket.onclose = () => {
                    controller.close();
                };
            }
        }, {
            highWaterMark: 16 * 1024,
            size(chunk) { return chunk.byteLength; },
        });

        const writable = new WritableStream<Uint8Array>({
            write: (chunk) => {
                socket.send(chunk);
            },
        }, {
            highWaterMark: 16 * 1024,
            size(chunk) { return chunk.byteLength; },
        });

        return { readable, writable };
    }
}
