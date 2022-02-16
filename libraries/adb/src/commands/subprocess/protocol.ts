import { PromiseResolver } from "@yume-chan/async";
import Struct, { placeholder, StructValueType } from "@yume-chan/struct";
import type { Adb } from "../../adb";
import { AdbFeatures } from "../../features";
import type { AdbSocket } from "../../socket";
import { encodeUtf8, ReadableStream, StructDeserializeStream, StructSerializeStream, TransformStream, WritableStream, WritableStreamDefaultWriter } from "../../utils";
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

type AdbShellProtocolPacketInit = typeof AdbShellProtocolPacket['TInit'];

type AdbShellProtocolPacket = StructValueType<typeof AdbShellProtocolPacket>;

class StdinSerializeStream extends TransformStream<ArrayBuffer, AdbShellProtocolPacketInit>{
    constructor() {
        super({
            transform(chunk, controller) {
                controller.enqueue({
                    id: AdbShellProtocolId.Stdin,
                    data: chunk,
                });
            },
            flush() {
                // TODO: AdbShellSubprocessProtocol: support closing stdin
            }
        });
    }
}

class StdoutDeserializeStream extends TransformStream<AdbShellProtocolPacket, ArrayBuffer>{
    constructor(type: AdbShellProtocolId.Stdout | AdbShellProtocolId.Stderr) {
        super({
            transform(chunk, controller) {
                if (chunk.id === type) {
                    controller.enqueue(chunk.data);
                }
            },
        });
    }
}

class MultiplexTransformStream<T>{
    private _passthrough = new TransformStream<T, T>();
    private _writer = this._passthrough.writable.getWriter();
    public get readable() { return this._passthrough.readable; }

    private _activeCount = 0;

    public createWriteable() {
        return new WritableStream<T>({
            start: () => {
                this._activeCount += 1;
            },
            write: async (chunk) => {
                // Take care back pressure
                await this._writer.ready;
                await this._writer.write(chunk);
            },
            abort: async (e) => {
                await this._writer.abort(e);
            },
            close: async () => {
                this._activeCount -= 1;
                if (this._activeCount === 0) {
                    await this._writer.close();
                }
            },
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
        // TODO: AdbShellSubprocessProtocol: Support raw mode
        // TODO: AdbShellSubprocessProtocol: Support setting `XTERM` environment variable
        return new AdbShellSubprocessProtocol(await adb.createSocket(`shell,v2,pty:${command}`));
    }

    private readonly _socket: AdbSocket;
    private _socketWriter: WritableStreamDefaultWriter<AdbShellProtocolPacketInit>;

    private _stdin = new TransformStream<ArrayBuffer, ArrayBuffer>();
    public get stdin() { return this._stdin.writable; }

    private _stdout: ReadableStream<ArrayBuffer>;
    public get stdout() { return this._stdout; }

    private _stderr: ReadableStream<ArrayBuffer>;
    public get stderr() { return this._stderr; }

    private readonly _exit = new PromiseResolver<number>();
    public get exit() { return this._exit.promise; }

    public constructor(socket: AdbSocket) {
        this._socket = socket;

        // Check this image to help you understand the stream graph
        // cspell: disable-next-line
        // https://www.plantuml.com/plantuml/png/bL91QiCm4Bpx5SAdv90lb1JISmiw5XzaQKf5PIkiLZIqzEyLSg8ks13gYtOykpFhiOw93N6UGjVDqK7rZsxKqNw0U_NTgVAy4empOy2mm4_olC0VEVEE47GUpnGjKdgXoD76q4GIEpyFhOwP_m28hW0NNzxNUig1_JdW0bA7muFIJDco1daJ_1SAX9bgvoPJPyIkSekhNYctvIGXrCH6tIsPL5fs-s6J5yc9BpWXhKtNdF2LgVYPGM_6GlMwfhWUsIt4lbScANrwlgVVUifPSVi__t44qStnwPvZwobdSmHHlL57p2vFuHS0

        const [stdout, stderr] = socket.readable
            .pipeThrough(new StructDeserializeStream(AdbShellProtocolPacket))
            .pipeThrough(new TransformStream({
                transform: (chunk, controller) => {
                    if (chunk.id === AdbShellProtocolId.Exit) {
                        this._exit.resolve(new Uint8Array(chunk.data)[0]!);
                        // We can let `StdoutTransformStream` to process `AdbShellProtocolId.Exit`,
                        // but since we need this `TransformStream` to capture the exit code anyway,
                        // terminating child streams here is killing two birds with one stone.
                        controller.terminate();
                        return;
                    }
                    controller.enqueue(chunk);
                }
            }))
            .tee();
        this._stdout = stdout
            .pipeThrough(new StdoutDeserializeStream(AdbShellProtocolId.Stdout));
        this._stderr = stderr
            .pipeThrough(new StdoutDeserializeStream(AdbShellProtocolId.Stderr));

        const multiplexer = new MultiplexTransformStream<AdbShellProtocolPacketInit>();
        multiplexer.readable
            .pipeThrough(new StructSerializeStream(AdbShellProtocolPacket))
            .pipeTo(socket.writable);

        this._stdin.readable
            .pipeThrough(new StdinSerializeStream())
            .pipeTo(multiplexer.createWriteable());

        this._socketWriter = multiplexer.createWriteable().getWriter();
    }

    public async resize(rows: number, cols: number) {
        await this._socketWriter.write({
            id: AdbShellProtocolId.WindowSizeChange,
            data: encodeUtf8(
                // The "correct" format is `${rows}x${cols},${x_pixels}x${y_pixels}`
                // However, according to https://linux.die.net/man/4/tty_ioctl
                // `x_pixels` and `y_pixels` are not used, so always passing `0` is fine.
                `${rows}x${cols},0x0\0`
            ),
        });
    }

    public kill() {
        return this._socket.close();
    }
}
