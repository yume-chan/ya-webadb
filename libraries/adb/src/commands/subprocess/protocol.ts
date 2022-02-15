import { PromiseResolver } from "@yume-chan/async";
import Struct, { placeholder } from "@yume-chan/struct";
import type { Adb } from "../../adb";
import { AdbFeatures } from "../../features";
import type { AdbSocket } from "../../socket";
import { AdbBufferedStream } from "../../stream";
import { encodeUtf8, TransformStream, WritableStream, WritableStreamDefaultWriter } from "../../utils";
import type { AdbSubprocessProtocol } from "./types";

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
export class AdbShellSubprocessProtocol implements AdbSubprocessProtocol {
    public static isSupported(adb: Adb) {
        return adb.features!.includes(AdbFeatures.ShellV2);
    }

    public static async spawn(adb: Adb, command: string) {
        // TODO: the service string may support more parameters
        return new AdbShellSubprocessProtocol(await adb.createSocket(`shell,v2,pty:${command}`));
    }

    private readonly _buffered: AdbBufferedStream;

    private _socketWriter: WritableStreamDefaultWriter<ArrayBuffer>;

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
        this._buffered = new AdbBufferedStream(socket);
        this.readData();
        this._socketWriter = socket.writable.getWriter();
        this._stdin.readable.pipeTo(new WritableStream<ArrayBuffer>({
            write: async (chunk) => {
                await this._socketWriter.ready;
                await this._socketWriter.write(chunk);
            },
            close() {
                // TODO: Shell protocol: close stdin
            },
        }, {
            highWaterMark: 16 * 1024,
            size(chunk) { return chunk.byteLength; },
        }));
    }

    private async readData() {
        while (true) {
            try {
                const packet = await AdbShellProtocolPacket.deserialize(this._buffered);
                switch (packet.id) {
                    case AdbShellProtocolId.Stdout:
                        await this._stdoutWriter.ready;
                        this._stdoutWriter.write(packet.data);
                        break;
                    case AdbShellProtocolId.Stderr:
                        await this._stderrWriter.ready;
                        this._stderrWriter.write(packet.data);
                        break;
                    case AdbShellProtocolId.Exit:
                        this._stdoutWriter.close();
                        this._stderrWriter.close();
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
        await this._socketWriter.write(
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
        return this._buffered.close();
    }
}
