import type { AsyncExactReadable } from "@yume-chan/struct";

export interface ScrcpyDeviceMessageParser {
    parse(id: number, stream: AsyncExactReadable): Promise<boolean>;

    close(): void;

    error(e?: unknown): void;
}
