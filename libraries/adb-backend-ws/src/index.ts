import { AdbBackend, ReadableStream, WritableStream } from '@yume-chan/adb';
import { PromiseResolver } from '@yume-chan/async';

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

        const resolver = new PromiseResolver();
        socket.onopen = resolver.resolve;
        socket.onerror = () => {
            resolver.reject(new Error('WebSocket connect failed'));
        };
        await resolver.promise;

        const readable = new ReadableStream({
            start: (controller) => {
                socket.onmessage = ({ data }: { data: ArrayBuffer; }) => {
                    controller.enqueue(data);
                };
                socket.onclose = () => {
                    controller.close();
                };
            }
        }, {
            highWaterMark: 16 * 1024,
            size(chunk) { return chunk.byteLength; },
        });

        const writable = new WritableStream({
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
