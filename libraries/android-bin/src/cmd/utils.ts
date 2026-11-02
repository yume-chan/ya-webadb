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

    // `abb` mode uses `\0` as the separator, allowing space in arguments.
    // The last `\0` is required for older versions of `adb`.
    return `${prefix}:${command.join("\0")}\0`;
}
