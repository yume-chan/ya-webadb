import { Event } from "@yume-chan/event";
import { ValueOrPromise } from "@yume-chan/struct";
import { AdbSocket } from "../../socket";

export interface AdbShell {
    readonly onStdout: Event<ArrayBuffer>;

    readonly onStderr: Event<ArrayBuffer>;

    readonly onExit: Event<number>;

    write(data: ArrayBuffer): Promise<void>;

    resize(rows: number, cols: number): ValueOrPromise<void>;

    kill(): ValueOrPromise<void>;
}

export interface AdbShellConstructor {
    new(socket: AdbSocket): AdbShell;
}
