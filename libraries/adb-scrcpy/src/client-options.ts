import type { AdbNoneProtocolSpawner } from "@yume-chan/adb";

export interface AdbScrcpyClientOptions {
    version?: string;
    spawner?: AdbNoneProtocolSpawner | undefined;
}
