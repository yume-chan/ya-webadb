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
import { ConcatStringStream, DecodeUtf8Stream } from "@yume-chan/stream-extra";

export class Cmd extends AdbCommandBase {
    #supportsShellV2: boolean;
    get supportsShellV2() {
        return this.#supportsShellV2;
    }

    #supportsCmd: boolean;
    get supportsCmd() {
        return this.#supportsCmd;
    }

    #supportsAbb: boolean;
    get supportsAbb() {
        return this.#supportsAbb;
    }

    #supportsAbbExec: boolean;
    get supportsAbbExec() {
        return this.#supportsAbbExec;
    }

    constructor(adb: Adb) {
        super(adb);
        this.#supportsShellV2 = adb.supportsFeature(AdbFeature.ShellV2);
        this.#supportsCmd = adb.supportsFeature(AdbFeature.Cmd);
        this.#supportsAbb = adb.supportsFeature(AdbFeature.Abb);
        this.#supportsAbbExec = adb.supportsFeature(AdbFeature.AbbExec);
    }

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
                .pipeThrough(new DecodeUtf8Stream())
                .pipeThrough(new ConcatStringStream()),
            process.stderr
                .pipeThrough(new DecodeUtf8Stream())
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
