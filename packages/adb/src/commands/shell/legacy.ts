import { EventEmitter } from "@yume-chan/event";
import { AdbSocket } from "../../socket";
import { AdbShell } from "./types";

export class AdbLegacyShell implements AdbShell {
    private readonly socket: AdbSocket;

    private readonly stdoutEvent = new EventEmitter<ArrayBuffer>();
    public get onStdout() { return this.stdoutEvent.event; }

    private readonly stderrEvent = new EventEmitter<ArrayBuffer>();
    public get onStderr() { return this.stderrEvent.event; }

    private readonly exitEvent = new EventEmitter<number>();
    public get onExit() { return this.exitEvent.event; }

    public constructor(socket: AdbSocket) {
        this.socket = socket;
        this.socket.onData(this.handleData, this);
        this.socket.onClose(this.handleExit, this);
    }

    private handleData(data: ArrayBuffer) {
        this.stdoutEvent.fire(data);
    }

    private handleExit() {
        this.exitEvent.fire(0);
    }

    public async write(data: ArrayBuffer) {
        this.socket.write(data);
    }

    public resize() {
        // Not supported
    }

    public kill() {
        return this.socket.close();
    }
}
