import { PromiseResolver } from "@yume-chan/async";
import Struct, { placeholder } from "@yume-chan/struct";
import type { Adb } from "../../adb";
import { AdbFeatures } from "../../features";
import type { AdbSocket } from "../../socket";
import { AdbBufferedStream } from "../../stream";
import { encodeUtf8, TransformStream, WritableStream, WritableStreamDefaultWriter } from "../../utils";
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

class WritableMultiplexer<T> {
    private writer: WritableStreamDefaultWriter<T>;

    public constructor(writer: WritableStreamDefaultWriter<T>) {
        this.writer = writer;
    }

    public createWritable(): WritableStream<T> {
        return new WritableStream({
            write: (chunk) => {
                return this.writer.write(chunk);
            },
        });
    }
}

class StdinTransformStream extends TransformStream<ArrayBuffer, ArrayBuffer>{
    constructor() {
        super({
            transform(chunk, controller) {
                controller.enqueue(AdbShellProtocolPacket.serialize(
                    {
                        id: AdbShellProtocolId.Stdin,
                        data: chunk,
                    }
                ));
            }
        });
    }
}

/**
 * Shell v2 a.k.a Shell Protocol
 *
 * Features:
 * * `stderr`: Yes
 * * `exit` exit code: Yes
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

    private _writableMultiplexer: WritableMultiplexer<ArrayBuffer>;
    private _writer: WritableStreamDefaultWriter<ArrayBuffer>;

    private _stdin = new StdinTransformStream();
    public get stdin() { return this._stdin.writable; }

    private _stdout = new TransformStream<ArrayBuffer, ArrayBuffer>();
    private _stdoutWriter = this._stdout.writable.getWriter();
    public get stdout() { return this._stdout.readable; }

    private _stderr = new TransformStream<ArrayBuffer, ArrayBuffer>();
    private _stderrWriter = this._stderr.writable.getWriter();
    public get stderr() { return this._stderr.readable; }

    private readonly _exit = new PromiseResolver<number>();
    public get exit() { return this._exit.promise; }

    public constructor(socket: AdbSocket) {
        this.stream = new AdbBufferedStream(socket);
        this.readData();
        this._writableMultiplexer = new WritableMultiplexer(socket.writable.getWriter());
        this._writer = this._writableMultiplexer.createWritable().getWriter();
        this._stdin.readable.pipeTo(this._writableMultiplexer.createWritable());
    }

    private async readData() {
        while (true) {
            try {
                // TODO: add back pressure to AdbShellProtocol
                const packet = await AdbShellProtocolPacket.deserialize(this.stream);
                switch (packet.id) {
                    case AdbShellProtocolId.Stdout:
                        this._stdoutWriter.write(packet.data);
                        break;
                    case AdbShellProtocolId.Stderr:
                        this._stderrWriter.write(packet.data);
                        break;
                    case AdbShellProtocolId.Exit:
                        this._exit.resolve(new Uint8Array(packet.data)[0]!);
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

    public async resize(rows: number, cols: number) {
        await this._writer.write(
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
