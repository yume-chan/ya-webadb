import type { AdbBackend } from "@yume-chan/adb";
import { AdbPacket, AdbPacketSerializeStream } from "@yume-chan/adb";
import type { Consumable } from "@yume-chan/stream-extra";
import {
    ConsumableWritableStream,
    DuplexStreamFactory,
    ReadableStream,
    StructDeserializeStream,
    pipeFrom,
} from "@yume-chan/stream-extra";

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
                reject(new Error("WebSocket connect failed"));
            };
        });

        const factory = new DuplexStreamFactory<
            Uint8Array,
            Consumable<Uint8Array>
        >({
            close: () => {
                socket.close();
            },
        });

        socket.onclose = () => {
            factory.dispose().catch((e) => {
                void e;
            });
        };

        const readable = factory.wrapReadable(
            new ReadableStream(
                {
                    start: (controller) => {
                        socket.onmessage = ({
                            data,
                        }: {
                            data: ArrayBuffer;
                        }) => {
                            controller.enqueue(new Uint8Array(data));
                        };
                    },
                },
                {
                    highWaterMark: 16 * 1024,
                    size(chunk) {
                        return chunk.byteLength;
                    },
                }
            )
        );

        const writable = factory.createWritable(
            new ConsumableWritableStream({
                write(chunk) {
                    socket.send(chunk);
                },
            })
        );

        return {
            readable: readable.pipeThrough(
                new StructDeserializeStream(AdbPacket)
            ),
            writable: pipeFrom(writable, new AdbPacketSerializeStream()),
        };
    }
}
