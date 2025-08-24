import type { Adb } from "@yume-chan/adb";
import {
    AdbFeature,
    AdbShellProtocolProcessImpl,
    adbShellProtocolSpawner,
} from "@yume-chan/adb";

import { Cmd } from "./service.js";
import { checkCommand, resolveFallback, serializeAbbService } from "./utils.js";

export function createCmdShellProtocolService(
    adb: Adb,
    fallback: Exclude<Cmd.Fallback, undefined>,
): Cmd.ShellProtocolService;
export function createCmdShellProtocolService(
    adb: Adb,
    fallback?: Cmd.Fallback,
): Cmd.ShellProtocolService | undefined;
export function createCmdShellProtocolService(
    adb: Adb,
    fallback?: Cmd.Fallback,
): Cmd.ShellProtocolService | undefined {
    if (adb.canUseFeature(AdbFeature.Abb)) {
        return {
            mode: Cmd.Mode.Abb,
            spawn: adbShellProtocolSpawner(async (command, signal) => {
                const service = serializeAbbService("abb", command);
                const socket = await adb.createSocket(service);
                return new AdbShellProtocolProcessImpl(socket, signal);
            }),
        };
    }

    const shellProtocolService = adb.subprocess.shellProtocol;
    if (!shellProtocolService) {
        return undefined;
    }

    if (adb.canUseFeature(AdbFeature.Cmd)) {
        return {
            mode: Cmd.Mode.Cmd,
            spawn: adbShellProtocolSpawner(async (command, signal) => {
                checkCommand(command);

                const newCommand = command.slice();
                newCommand.unshift("cmd");
                return shellProtocolService.spawn(newCommand, signal);
            }),
        };
    }

    if (fallback) {
        return {
            mode: Cmd.Mode.Fallback,
            spawn: adbShellProtocolSpawner(async (command, signal) => {
                checkCommand(command);

                const newCommand = command.slice();
                newCommand[0] = resolveFallback(fallback, command[0]!);
                return shellProtocolService.spawn(newCommand, signal);
            }),
        };
    }

    return undefined;
}
