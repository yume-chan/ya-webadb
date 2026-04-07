import { getGlobalValue } from "./utils.js";

interface TimerHandler {
    (...args: unknown[]): void;
}

interface SetTimeoutFunction {
    (handler: TimerHandler, timeout?: number, ...args: unknown[]): number;
}

interface ClearTimeoutFunction {
    (timeoutId: number): void;
}

export const setTimeout =
    getGlobalValue<SetTimeoutFunction>("setTimeout") ?? (() => {});
export const clearTimeout =
    getGlobalValue<ClearTimeoutFunction>("clearTimeout") ?? (() => {});
