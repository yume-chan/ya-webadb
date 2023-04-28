import type { AdbBackend, AdbPacketData, AdbPacketInit } from "@yume-chan/adb";
import { AdbCommand } from "@yume-chan/adb";
import type { Consumable, ReadableWritablePair } from "@yume-chan/stream-extra";
import {
    DuplexStreamFactory,
    ReadableStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import { EMPTY_UINT8_ARRAY } from "@yume-chan/struct";

class AdbProxyConnection
    implements ReadableWritablePair<AdbPacketData, Consumable<AdbPacketInit>>
{
    public readonly readable: ReadableStream<AdbPacketData>;
    public readonly writable: WritableStream<Consumable<AdbPacketInit>>;

    public constructor(port: MessagePort) {
        const duplex = new DuplexStreamFactory<
            AdbPacketData,
            Consumable<AdbPacketInit>
        >({
            close: () => {
                // CNXN means disconnected
                port.postMessage({
                    command: AdbCommand.Connect,
                    arg0: 0,
                    arg1: 0,
                    payload: EMPTY_UINT8_ARRAY,
                } satisfies AdbPacketData);
                port.close();
            },
        });

        this.readable = duplex.wrapReadable(
            new ReadableStream({
                start(controller) {
                    port.onmessage = (e) => {
                        const data = e.data as AdbPacketData;
                        switch (data.command) {
                            case AdbCommand.Auth:
                            case AdbCommand.Connect:
                                controller.close();
                                break;
                            case AdbCommand.Open:
                            case AdbCommand.Close:
                            case AdbCommand.OK:
                            case AdbCommand.Write:
                                controller.enqueue(data);
                                break;
                        }
                    };
                },
            })
        );

        this.writable = duplex.createWritable(
            new WritableStream({
                write(chunk) {
                    switch (chunk.value.command) {
                        case AdbCommand.Auth:
                            throw new Error(
                                `Can't send AUTH packet through proxy`
                            );
                        case AdbCommand.Connect:
                            throw new Error(
                                `Can't send CNXN packet through proxy`
                            );
                        case AdbCommand.Open:
                        case AdbCommand.Close:
                        case AdbCommand.OK:
                        case AdbCommand.Write: {
                            // Can't transfer `chunk.payload`, will break clients
                            port.postMessage(chunk.value);
                            chunk.consume();
                            break;
                        }
                    }
                },
            })
        );
    }
}

export class AdbProxyBackend implements AdbBackend {
    public static isSupported(): boolean {
        return true;
    }

    private readonly port: MessagePort;

    public readonly serial: string;

    public name: string | undefined;

    public constructor(port: MessagePort, name?: string) {
        this.port = port;
        this.serial = `proxy`;
        this.name = name;
    }

    public connect() {
        return new AdbProxyConnection(this.port);
    }
}
