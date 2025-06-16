import type { Adb, AdbShellProtocolProcess } from "@yume-chan/adb";
import {
    AdbFeature,
    AdbNoneProtocolProcessImpl,
    AdbNoneProtocolSpawner,
    AdbServiceBase,
    AdbShellProtocolProcessImpl,
    AdbShellProtocolSpawner,
} from "@yume-chan/adb";

export class CmdNoneProtocolService extends AdbNoneProtocolSpawner {
    #supportsAbbExec: boolean;
    get supportsAbbExec(): boolean {
        return this.#supportsAbbExec;
    }

    #supportsCmd: boolean;
    get supportsCmd(): boolean {
        return this.#supportsCmd;
    }

    get isSupported() {
        return this.#supportsAbbExec || this.#supportsCmd;
    }

    constructor(
        adb: Adb,
        fallback?:
            | string
            | Record<string, string>
            | ((service: string) => string),
    ) {
        super(async (command) => {
            if (this.#supportsAbbExec) {
                return new AdbNoneProtocolProcessImpl(
                    await adb.createSocket(`abb_exec:${command.join("\0")}\0`),
                );
            }

            if (this.#supportsCmd) {
                return adb.subprocess.noneProtocol.spawn(
                    `cmd ${command.join(" ")}`,
                );
            }

            if (typeof fallback === "function") {
                fallback = fallback(command[0]!);
            } else if (typeof fallback === "object") {
                fallback = fallback[command[0]!];
            }

            if (!fallback) {
                throw new Error("Unsupported");
            }

            const fallbackCommand = command.slice();
            fallbackCommand[0] = fallback;
            return adb.subprocess.noneProtocol.spawn(fallbackCommand);
        });

        this.#supportsCmd = adb.canUseFeature(AdbFeature.Cmd);
        this.#supportsAbbExec = adb.canUseFeature(AdbFeature.AbbExec);
    }
}

export class CmdShellProtocolService extends AdbShellProtocolSpawner {
    #adb: Adb;

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
            (this.#supportsCmd && !!this.#adb.subprocess.shellProtocol)
        );
    }

    constructor(
        adb: Adb,
        fallback?:
            | string
            | Record<string, string>
            | ((service: string) => string),
    ) {
        super(async (command): Promise<AdbShellProtocolProcess> => {
            if (this.#supportsAbb) {
                return new AdbShellProtocolProcessImpl(
                    await this.#adb.createSocket(`abb:${command.join("\0")}\0`),
                );
            }

            if (!adb.subprocess.shellProtocol) {
                throw new Error("Unsupported");
            }

            if (this.#supportsCmd) {
                return adb.subprocess.shellProtocol.spawn(
                    `cmd ${command.join(" ")}`,
                );
            }

            if (typeof fallback === "function") {
                fallback = fallback(command[0]!);
            } else if (typeof fallback === "object") {
                fallback = fallback[command[0]!];
            }

            if (!fallback) {
                throw new Error("Unsupported");
            }

            const fallbackCommand = command.slice();
            fallbackCommand[0] = fallback;
            return adb.subprocess.shellProtocol.spawn(fallbackCommand);
        });

        this.#adb = adb;
        this.#supportsCmd = adb.canUseFeature(AdbFeature.Cmd);
        this.#supportsAbb = adb.canUseFeature(AdbFeature.Abb);
    }
}

export class Cmd extends AdbServiceBase {
    #noneProtocol: CmdNoneProtocolService | undefined;
    get noneProtocol() {
        return this.#noneProtocol;
    }

    #shellProtocol: CmdShellProtocolService | undefined;
    get shellProtocol() {
        return this.#shellProtocol;
    }

    constructor(
        adb: Adb,
        fallback?:
            | string
            | Record<string, string>
            | ((service: string) => string),
    ) {
        super(adb);

        if (
            adb.canUseFeature(AdbFeature.AbbExec) ||
            adb.canUseFeature(AdbFeature.Cmd)
        ) {
            this.#noneProtocol = new CmdNoneProtocolService(adb, fallback);
        }

        if (
            adb.canUseFeature(AdbFeature.Abb) ||
            (adb.canUseFeature(AdbFeature.Cmd) &&
                adb.canUseFeature(AdbFeature.ShellV2))
        ) {
            this.#shellProtocol = new CmdShellProtocolService(adb, fallback);
        }
    }
}
