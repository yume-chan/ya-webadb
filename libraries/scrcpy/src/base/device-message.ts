import type { AsyncExactReadable } from "@yume-chan/struct";

export interface ScrcpyDeviceMessageParser {
    readonly id: number | readonly number[];

    parse(id: number, stream: AsyncExactReadable): Promise<undefined>;

    close(): void;

    error(e?: unknown): void;
}

export class ScrcpyDeviceMessageParsers {
    #parsers: ScrcpyDeviceMessageParser[] = [];
    get parsers(): readonly ScrcpyDeviceMessageParser[] {
        return this.#parsers;
    }

    #add(id: number, parser: ScrcpyDeviceMessageParser) {
        if (this.#parsers[id]) {
            throw new Error(`Duplicate parser for id ${id}`);
        }
        this.#parsers[id] = parser;
    }

    add<T extends ScrcpyDeviceMessageParser>(parser: T): T {
        if (Array.isArray(parser.id)) {
            for (const id of parser.id) {
                this.#add(id as number, parser);
            }
        } else {
            this.#add(parser.id as number, parser);
        }

        return parser;
    }

    async parse(id: number, stream: AsyncExactReadable): Promise<undefined> {
        const parser = this.#parsers[id];
        if (!parser) {
            throw new Error(`Unknown device message id ${id}`);
        }

        return parser.parse(id, stream);
    }

    close() {
        for (const parser of this.#parsers) {
            parser.close();
        }
    }

    error(e?: unknown) {
        for (const parser of this.#parsers) {
            parser.error(e);
        }
    }
}
