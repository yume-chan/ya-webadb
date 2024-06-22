import type {
    Adb,
    AdbSubprocessProtocol,
    AdbSubprocessProtocolConstructor,
    AdbSubprocessWaitResult,
} from "@yume-chan/adb";
import {
    AdbCommandBase,
    AdbFeature,
    AdbSubprocessNoneProtocol,
    AdbSubprocessShellProtocol,
} from "@yume-chan/adb";
import { ConcatStringStream, TextDecoderStream } from "@yume-chan/stream-extra";

export class Cmd extends AdbCommandBase {
    #supportsShellV2: boolean;
    get supportsShellV2(): boolean {
        return this.#supportsShellV2;
    }

    #supportsCmd: boolean;
    get supportsCmd(): boolean {
        return this.#supportsCmd;
    }

    #supportsAbb: boolean;
    get supportsAbb(): boolean {
        return this.#supportsAbb;
    }

    #supportsAbbExec: boolean;
    get supportsAbbExec(): boolean {
        return this.#supportsAbbExec;
    }

    constructor(adb: Adb) {
        super(adb);
        this.#supportsShellV2 = adb.canUseFeature(AdbFeature.ShellV2);
        this.#supportsCmd = adb.canUseFeature(AdbFeature.Cmd);
        this.#supportsAbb = adb.canUseFeature(AdbFeature.Abb);
        this.#supportsAbbExec = adb.canUseFeature(AdbFeature.AbbExec);
    }

    /**
     * Spawn a new `cmd` command. It will use ADB's `abb` command if available.
     *
     * @param shellProtocol
     * Whether to use shell protocol. If `true`, `stdout` and `stderr` will be separated.
     *
     * `cmd` doesn't use PTY, so even when shell protocol is used,
     * resizing terminal size and closing `stdin` are not supported.
     * @param command The command to run.
     * @param args The arguments to pass to the command.
     * @returns An `AdbSubprocessProtocol` that provides output streams.
     */
    async spawn(
        shellProtocol: boolean,
        command: string,
        ...args: string[]
    ): Promise<AdbSubprocessProtocol> {
        let supportsAbb: boolean;
        let supportsCmd: boolean = this.#supportsCmd;
        let service: string;
        let Protocol: AdbSubprocessProtocolConstructor;
        if (shellProtocol) {
            supportsAbb = this.#supportsAbb;
            supportsCmd &&= this.supportsShellV2;
            service = "abb";
            Protocol = AdbSubprocessShellProtocol;
        } else {
            supportsAbb = this.#supportsAbbExec;
            service = "abb_exec";
            Protocol = AdbSubprocessNoneProtocol;
        }

        if (supportsAbb) {
            return new Protocol(
                await this.adb.createSocket(
                    `${service}:${command}\0${args.join("\0")}\0`,
                ),
            );
        }

        if (supportsCmd) {
            return Protocol.raw(this.adb, `cmd ${command} ${args.join(" ")}`);
        }

        throw new Error("Not supported");
    }

    async spawnAndWait(
        command: string,
        ...args: string[]
    ): Promise<AdbSubprocessWaitResult> {
        const process = await this.spawn(true, command, ...args);

        const [stdout, stderr, exitCode] = await Promise.all([
            process.stdout
                .pipeThrough(new TextDecoderStream())
                .pipeThrough(new ConcatStringStream()),
            process.stderr
                .pipeThrough(new TextDecoderStream())
                .pipeThrough(new ConcatStringStream()),
            process.exit,
        ]);

        return {
            stdout,
            stderr,
            exitCode,
        };
    }
}
