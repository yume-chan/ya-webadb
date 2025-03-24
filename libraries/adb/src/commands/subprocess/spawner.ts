import type { AbortSignal } from "@yume-chan/stream-extra";

import type { Adb } from "../../adb.js";

import type { Process } from "./process.js";

export interface ProcessSpawner {
    raw(command: string[], signal?: AbortSignal): Promise<Process>;

    pty(command: string[], signal?: AbortSignal): Promise<Process>;
}

export interface AdbProcessSpawner extends ProcessSpawner {
    get adb(): Adb;

    get isSupported(): boolean;
}
