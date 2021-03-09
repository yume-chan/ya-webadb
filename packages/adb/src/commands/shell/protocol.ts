import { EventEmitter } from "@yume-chan/event";
import Struct, { placeholder } from "@yume-chan/struct";
import { AdbSocket } from "../../socket";
import { AdbBufferedStream } from "../../stream";
import { AdbShell } from "./types";

export enum AdbShellProtocolId {
    Stdin,
    Stdout,
    Stderr,
    Exit,
    CloseStdin,
    WindowSizeChange,
}

const AdbShellProtocolPacket = new Struct({ littleEndian: true })
    .uint8('id', placeholder<AdbShellProtocolId>())
    .uint32('length')
    .arrayBuffer('data', { lengthField: 'length' });

/**
 * Shell v2 is also called Shell Protocol
 */
export class AdbShellProtocol implements AdbShell {
    private readonly stream: AdbBufferedStream;

    private readonly stdoutEvent = new EventEmitter<ArrayBuffer>();
    public get onStdout() { return this.stdoutEvent.event; }

    private readonly stderrEvent = new EventEmitter<ArrayBuffer>();
    public get onStderr() { return this.stderrEvent.event; }

    private readonly exitEvent = new EventEmitter<number>();
    public get onExit() { return this.exitEvent.event; }

    public constructor(socket: AdbSocket) {
        this.stream = new AdbBufferedStream(socket);
        this.readData();
    }

    private async readData() {
        while (true) {
            try {
                const packet = await AdbShellProtocolPacket.deserialize(this.stream);
                switch (packet.id) {
                    case AdbShellProtocolId.Stdout:
                        this.stdoutEvent.fire(packet.data);
                        break;
                    case AdbShellProtocolId.Stderr:
                        this.stderrEvent.fire(packet.data);
                        break;
                    case AdbShellProtocolId.Exit:
                        this.exitEvent.fire(new Uint8Array(packet.data)[0]);
                        break;
                }
            } catch {
                return;
            }
        }
    }

    public async write(data: ArrayBuffer) {
        this.stream.write(
            AdbShellProtocolPacket.serialize(
                {
                    id: AdbShellProtocolId.Stdin,
                    data,
                },
                this.stream
            )
        );
    }

    public async resize(rows: number, cols: number) {
        this.stream.write(
            AdbShellProtocolPacket.serialize(
                {
                    id: AdbShellProtocolId.WindowSizeChange,
                    data: this.stream.encodeUtf8(
                        // Correct format is ${rows}x${cols},${x_pixels}x${y_pixels}
                        // But from https://linux.die.net/man/4/tty_ioctl
                        // x_pixels and y_pixels are unused
                        `${rows}x${cols},${0}x${0}\0`
                    ),
                },
                this.stream
            )
        );
    }

    public kill() {
        return this.stream.close();
    }
}
