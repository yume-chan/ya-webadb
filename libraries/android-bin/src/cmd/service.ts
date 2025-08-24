import type {
    Adb,
    AdbNoneProtocolSpawner,
    AdbShellProtocolSpawner,
} from "@yume-chan/adb";
import { AdbServiceBase } from "@yume-chan/adb";

import { createCmdNoneProtocolService } from "./none.js";
import { createCmdShellProtocolService } from "./shell.js";

export class Cmd extends AdbServiceBase {
    static readonly Mode = {
        Abb: 0,
        Cmd: 1,
        Fallback: 2,
    } as const;

    static readonly createNoneProtocolService = createCmdNoneProtocolService;
    static readonly createShellProtocolService = createCmdShellProtocolService;

    #noneProtocol: Cmd.NoneProtocolService | undefined;
    get noneProtocol() {
        return this.#noneProtocol;
    }

    #shellProtocol: Cmd.ShellProtocolService | undefined;
    get shellProtocol() {
        return this.#shellProtocol;
    }

    constructor(adb: Adb, fallback?: Cmd.Fallback) {
        super(adb);

        this.#noneProtocol = createCmdNoneProtocolService(adb, fallback);
        this.#shellProtocol = createCmdShellProtocolService(adb, fallback);
    }
}

export namespace Cmd {
    export type Fallback =
        | string
        | Record<string, string>
        | ((service: string) => string)
        | undefined;

    export type Mode = (typeof Cmd.Mode)[keyof typeof Cmd.Mode];

    export interface NoneProtocolService {
        mode: Mode;
        spawn: AdbNoneProtocolSpawner;
    }

    export interface ShellProtocolService {
        mode: Mode;
        spawn: AdbShellProtocolSpawner;
    }
}
