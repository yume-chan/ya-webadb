import type { Adb, AdbSubprocessProtocolConstructor } from "@yume-chan/adb";
import {
    AdbCommandBase,
    AdbFeature,
    AdbSubprocessNoneProtocol,
    AdbSubprocessShellProtocol,
} from "@yume-chan/adb";

export class Cmd extends AdbCommandBase {
    private _supportsShellV2: boolean;
    private _supportsCmd: boolean;
    private _supportsAbb: boolean;
    private _supportsAbbExec: boolean;

    public get supportsShellV2() {
        return this._supportsShellV2;
    }
    public get supportsCmd() {
        return this._supportsCmd;
    }
    public get supportsAbb() {
        return this._supportsAbb;
    }
    public get supportsAbbExec() {
        return this._supportsAbbExec;
    }

    public constructor(adb: Adb) {
        super(adb);
        this._supportsShellV2 = adb.supportsFeature(AdbFeature.ShellV2);
        this._supportsCmd = adb.supportsFeature(AdbFeature.Cmd);
        this._supportsAbb = adb.supportsFeature(AdbFeature.Abb);
        this._supportsAbbExec = adb.supportsFeature(AdbFeature.AbbExec);
    }

    public async spawn(
        shellProtocol: boolean,
        command: string,
        ...args: string[]
    ) {
        let supportsAbb: boolean;
        let supportsCmd: boolean = this.supportsCmd;
        let service: string;
        let Protocol: AdbSubprocessProtocolConstructor;
        if (shellProtocol) {
            supportsAbb = this._supportsAbb;
            supportsCmd &&= this.supportsShellV2;
            service = "abb";
            Protocol = AdbSubprocessShellProtocol;
        } else {
            supportsAbb = this._supportsAbbExec;
            service = "abb_exec";
            Protocol = AdbSubprocessNoneProtocol;
        }

        if (supportsAbb) {
            const socket = await this.adb.createSocket(
                `${service}:${command}\0${args.join("\0")}\0`
            );
            return new Protocol(socket);
        } else if (supportsCmd) {
            return Protocol.raw(this.adb, `cmd ${command} ${args.join(" ")}`);
        } else {
            throw new Error("Not supported");
        }
    }
}
