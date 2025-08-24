import type { Adb } from "@yume-chan/adb";
import {
    AdbFeature,
    AdbNoneProtocolProcessImpl,
    adbNoneProtocolSpawner,
} from "@yume-chan/adb";

import { Cmd } from "./service.js";
import { checkCommand, resolveFallback, serializeAbbService } from "./utils.js";

export function createCmdNoneProtocolService(
    adb: Adb,
    fallback: Exclude<Cmd.Fallback, undefined>,
): Cmd.NoneProtocolService;
export function createCmdNoneProtocolService(
    adb: Adb,
    fallback?: Cmd.Fallback,
): Cmd.NoneProtocolService | undefined;
export function createCmdNoneProtocolService(
    adb: Adb,
    fallback?: Cmd.Fallback,
): Cmd.NoneProtocolService | undefined {
    if (adb.canUseFeature(AdbFeature.AbbExec)) {
        return {
            mode: Cmd.Mode.Abb,
            spawn: adbNoneProtocolSpawner(async (command, signal) => {
                const service = serializeAbbService("abb_exec", command);
                const socket = await adb.createSocket(service);
                return new AdbNoneProtocolProcessImpl(socket, signal);
            }),
        };
    }

    if (adb.canUseFeature(AdbFeature.Cmd)) {
        return {
            mode: Cmd.Mode.Cmd,
            spawn: adbNoneProtocolSpawner(async (command, signal) => {
                checkCommand(command);

                const newCommand = command.slice();
                newCommand.unshift("cmd");
                return adb.subprocess.noneProtocol.spawn(newCommand, signal);
            }),
        };
    }

    if (fallback) {
        return {
            mode: Cmd.Mode.Fallback,
            spawn: adbNoneProtocolSpawner(async (command, signal) => {
                checkCommand(command);

                const newCommand = command.slice();
                newCommand[0] = resolveFallback(fallback, command[0]!);
                return adb.subprocess.noneProtocol.spawn(newCommand, signal);
            }),
        };
    }

    return undefined;
}
