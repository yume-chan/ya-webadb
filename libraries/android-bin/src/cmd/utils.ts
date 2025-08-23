import type { Cmd } from "./service.js";

export function resolveFallback(fallback: Cmd.Fallback, command: string) {
    if (typeof fallback === "function") {
        fallback = fallback(command);
    } else if (typeof fallback === "object" && fallback !== null) {
        fallback = fallback[command];
    }

    if (!fallback) {
        throw new Error(
            `Neither abb nor cmd is supported, and no fallback for command ${command} is provided`,
        );
    }

    return fallback;
}

export function checkCommand(command: readonly string[]) {
    if (!command.length) {
        throw new TypeError("Command is empty");
    }
}
