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
import { TabbyAdb } from "./state";

export class Session extends BaseSession {
    private shell!: AdbSubprocessProtocol;
    private writer!: WritableStreamDefaultWriter<Consumable<Uint8Array>>;

    constructor(injector: Injector, logger: Logger) {
        super(logger);
    }

    async start(): Promise<void> {
        if (!TabbyAdb.value) {
            return;
        }

        this.open = true;

        this.shell = await TabbyAdb.value.subprocess.shell();
        this.writer = this.shell.stdin.getWriter();
        this.shell.stdout.pipeTo(
            new WritableStream({
                write: (chunk) => {
                    this.emitOutput(Buffer.from(chunk));
                },
            })
        );
        this.shell.exit.then(() => {
            this.closed.next();
        });
    }

    resize(columns: number, rows: number): void {
        this.shell.resize(columns, rows);
    }

    write(data: Buffer): void {
        ConsumableWritableStream.write(this.writer, data);
    }

    kill(_signal?: string): void {
        this.shell.kill();
    }

    async gracefullyKillProcess(): Promise<void> {}

    supportsWorkingDirectory(): boolean {
        return false;
    }

    async getWorkingDirectory(): Promise<string | null> {
        return null;
    }
}
