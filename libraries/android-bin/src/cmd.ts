import type { Adb, AdbProcessSpawner, Process } from "@yume-chan/adb";
import {
    AdbFeature,
    AdbNoneProtocolProcess,
    AdbServiceBase,
    ProcessHelper,
} from "@yume-chan/adb";

export class CmdNoneProtocolSpawner
    extends AdbServiceBase
    implements AdbProcessSpawner
{
    #supportsCmd: boolean;
    get supportsCmd(): boolean {
        return this.#supportsCmd;
    }

    #supportsAbbExec: boolean;
    get supportsAbbExec(): boolean {
        return this.#supportsAbbExec;
    }

    get isSupported() {
        return this.#supportsAbbExec || this.#supportsCmd;
    }

    constructor(adb: Adb) {
        super(adb);
        this.#supportsCmd = adb.canUseFeature(AdbFeature.Cmd);
        this.#supportsAbbExec = adb.canUseFeature(AdbFeature.AbbExec);
    }

    async raw(command: string[]): Promise<Process> {
        if (this.#supportsAbbExec) {
            return new AdbNoneProtocolProcess(
                await this.adb.createSocket(`abb_exec:${command.join("\0")}\0`),
            );
        }

        if (this.#supportsCmd) {
            return this.adb.subprocess.noneProtocol.spawn(
                `cmd ${command.join(" ")}`,
            );
        }

        throw new Error("Unsupported");
    }

    pty(): Promise<Process> {
        throw new Error("Unsupported");
    }
}

export class CmdShellProtocolSpawner
    extends AdbServiceBase
    implements AdbProcessSpawner
{
    #supportsCmd: boolean;
    get supportsCmd(): boolean {
        return this.#supportsCmd;
    }

    #supportsAbb: boolean;
    get supportsAbb(): boolean {
        return this.#supportsAbb;
    }

    get isSupported() {
        return (
            this.#supportsAbb ||
            (this.#supportsCmd && !!this.adb.subprocess.shellProtocol)
        );
    }

    constructor(adb: Adb) {
        super(adb);
        this.#supportsCmd = adb.canUseFeature(AdbFeature.Cmd);
        this.#supportsAbb = adb.canUseFeature(AdbFeature.Abb);
    }

    async raw(command: string[]): Promise<Process> {
        if (this.#supportsAbb) {
            return new AdbNoneProtocolProcess(
                await this.adb.createSocket(`abb:${command.join("\0")}\0`),
            );
        }

        if (this.#supportsCmd && this.adb.subprocess.shellProtocol) {
            return this.adb.subprocess.shellProtocol.spawn(
                `cmd ${command.join(" ")}`,
            );
        }

        throw new Error("Unsupported");
    }

    pty(): Promise<Process> {
        throw new Error("Unsupported");
    }
}

export class Cmd extends AdbServiceBase {
    #noneProtocol: ProcessHelper | undefined;
    get noneProtocol() {
        return this.#noneProtocol;
    }

    #shellProtocol: ProcessHelper | undefined;
    get shellProtocol() {
        return this.#shellProtocol;
    }

    constructor(adb: Adb) {
        super(adb);

        if (
            adb.canUseFeature(AdbFeature.AbbExec) ||
            adb.canUseFeature(AdbFeature.Cmd)
        ) {
            this.#noneProtocol = new ProcessHelper(
                new CmdNoneProtocolSpawner(adb),
            );
        }

        if (
            adb.canUseFeature(AdbFeature.Abb) ||
            (adb.canUseFeature(AdbFeature.Cmd) &&
                adb.canUseFeature(AdbFeature.ShellV2))
        ) {
            this.#shellProtocol = new ProcessHelper(
                new CmdShellProtocolSpawner(adb),
            );
        }
    }
}
