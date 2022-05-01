import { AdbPacket, AdbPacketSerializeStream, DuplexStreamFactory, pipeFrom, ReadableStream, StructDeserializeStream, WritableStream, type AdbBackend } from '@yume-chan/adb';

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

        const factory = new DuplexStreamFactory<Uint8Array, Uint8Array>({
            close: () => {
                socket.close();
            },
        });

        socket.onclose = () => {
            factory.dispose();
        };

        const readable = factory.wrapReadable(new ReadableStream({
            start: (controller) => {
                socket.onmessage = ({ data }: { data: ArrayBuffer; }) => {
                    controller.enqueue(new Uint8Array(data));
                };
            }
        }, {
            highWaterMark: 16 * 1024,
            size(chunk) { return chunk.byteLength; },
        }));

        const writable = factory.createWritable(new WritableStream({
            write: (chunk) => {
                socket.send(chunk);
            },
        }, {
            highWaterMark: 16 * 1024,
            size(chunk) { return chunk.byteLength; },
        }));

        return {
            readable: readable.pipeThrough(new StructDeserializeStream(AdbPacket)),
            writable: pipeFrom(writable, new AdbPacketSerializeStream()),
        };
    }
}
