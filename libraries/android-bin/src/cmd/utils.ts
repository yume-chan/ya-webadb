import { splitCommand } from "@yume-chan/adb";

import type { Cmd } from "./service.js";

export function resolveFallback(
    fallback: Cmd.Fallback,
    command: string,
): string {
    if (typeof fallback === "function") {
        fallback = fallback(command);
    } else if (typeof fallback === "object" && fallback !== null) {
        fallback = fallback[command];
    }

    if (!fallback) {
        throw new Error(`No fallback configured for command "${command}"`);
    }

    return fallback;
}

export function checkCommand(command: readonly string[]) {
    if (!command.length) {
        throw new TypeError("Command is empty");
    }
}

export function serializeAbbService(
    prefix: string,
    command: readonly string[],
): string {
    checkCommand(command);

    // `abb` mode doesn't use `sh -c` to execute to command,
    // so it doesn't accept escaped arguments.
    // `splitCommand` can be used to remove the escaping,
    // each item in `command` must be a single argument.
    const newCommand = command.map((arg) => splitCommand(arg)[0]!);

    // `abb` mode uses `\0` as the separator, allowing space in arguments.
    // The last `\0` is required for older versions of `adb`.
    return `${prefix}:${newCommand.join("\0")}\0`;
}
