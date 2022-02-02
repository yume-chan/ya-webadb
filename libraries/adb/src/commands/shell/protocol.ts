import { EventEmitter } from "@yume-chan/event";
import Struct, { placeholder } from "@yume-chan/struct";
import type { Adb } from "../../adb";
import { AdbFeatures } from "../../features";
import type { AdbSocket } from "../../socket";
import { AdbBufferedStream } from "../../stream";
import { encodeUtf8 } from "../../utils";
import type { AdbShell } from "./types";

export enum AdbShellProtocolId {
    Stdin,
    Stdout,
    Stderr,
    Exit,
    CloseStdin,
    WindowSizeChange,
}

// This packet format is used in both direction.
const AdbShellProtocolPacket = new Struct({ littleEndian: true })
    .uint8('id', placeholder<AdbShellProtocolId>())
    .uint32('length')
    .arrayBuffer('data', { lengthField: 'length' });

function assertUnreachable(x: never): never {
    throw new Error("Unreachable");
}

/**
 * Shell v2 a.k.a Shell Protocol
 *
 * Features:
 * * `onStderr`: Yes
 * * `onExit` exit code: Yes
 * * `resize`: Yes
 */
export class AdbShellProtocol implements AdbShell {
    public static isSupported(adb: Adb) {
        return adb.features!.includes(AdbFeatures.ShellV2);
    }

    public static async spawn(adb: Adb, command: string) {
        // TODO: the service string may support more parameters
        return new AdbShellProtocol(await adb.createSocket(`shell,v2,pty:${command}`));
    }

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
                        this.exitEvent.fire(new Uint8Array(packet.data)[0]!);
                        break;
                    case AdbShellProtocolId.CloseStdin:
                    case AdbShellProtocolId.Stdin:
                    case AdbShellProtocolId.WindowSizeChange:
                        // These ids are client-to-server
                        throw new Error('unreachable');
                    default:
                        assertUnreachable(packet.id);
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
                }
            )
        );
    }

    public async resize(rows: number, cols: number) {
        await this.stream.write(
            AdbShellProtocolPacket.serialize(
                {
                    id: AdbShellProtocolId.WindowSizeChange,
                    data: encodeUtf8(
                        // The "correct" format is `${rows}x${cols},${x_pixels}x${y_pixels}`
                        // However, according to https://linux.die.net/man/4/tty_ioctl
                        // `x_pixels` and `y_pixels` are not used, so always pass `0` is fine.
                        `${rows}x${cols},0x0\0`
                    ),
                }
            )
        );
    }

    public kill() {
        return this.stream.close();
    }
}
