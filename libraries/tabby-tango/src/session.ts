import type { Injector } from "@angular/core";
import { AdbSubprocessProtocol } from "@yume-chan/adb";
import {
    Consumable,
    ConsumableWritableStream,
    WritableStream,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import type { Logger } from "tabby-core";
import { BaseSession } from "tabby-terminal";
import { AdbState } from "./state";

export class AdbSession extends BaseSession {
    private shell!: AdbSubprocessProtocol;
    private writer!: WritableStreamDefaultWriter<Consumable<Uint8Array>>;

    constructor(injector: Injector, logger: Logger) {
        super(logger);
    }

    async start(): Promise<void> {
        const adb = AdbState.value;
        if (!adb) {
            return;
        }

        this.open = true;

        this.shell = await adb.subprocess.shell();
        this.writer = this.shell.stdin.getWriter();
        this.shell.stdout.pipeTo(
            new WritableStream({
                write: (chunk) => {
                    this.emitOutput(Buffer.from(chunk));
                },
            })
        );

        adb.disconnected.then(() => {
            this.emitOutput(Buffer.from("\n[Disconnected]\n", "utf8"));
        });
    }

    resize(columns: number, rows: number): void {
        this.shell?.resize(columns, rows);
    }

    write(data: Buffer): void {
        ConsumableWritableStream.write(this.writer, data);
    }

    kill(_signal?: string): void {
        this.shell?.kill();
    }

    async gracefullyKillProcess(): Promise<void> {}

    supportsWorkingDirectory(): boolean {
        return false;
    }

    async getWorkingDirectory(): Promise<string | null> {
        return null;
    }
}
