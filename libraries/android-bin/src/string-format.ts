export class ParseError extends Error {
    #expected: readonly string[];

    get expected(): readonly string[] {
        return this.#expected;
    }

    constructor(expected: readonly string[]) {
        super(`Expected ${expected.join(", ")}`);
        this.#expected = expected;
    }
}

export interface Reader {
    value: string;
    position: number;
}

export interface Format<T> {
    parse(reader: Reader): T;
    stringify(value: T): string;
}

type UnionResult<T extends readonly Format<unknown>[]> = Exclude<
    {
        [K in keyof T]: T[K] extends Format<infer F> ? F : never;
    }[number],
    undefined
>;

type SequenceResult<
    T extends readonly (
        | Format<unknown>
        | { name: string; format: Format<unknown> }
    )[],
> = {
    [K in keyof T as K extends `${number}`
        ? T[K] extends { name: infer N extends string }
            ? N
            : never
        : never]: T[K] extends { format: Format<infer F> } ? F : never;
} extends infer R extends Record<string, unknown>
    ? R
    : never;

export const p = {
    literal: <T extends string>(value: T): Format<T> => ({
        parse(reader) {
            if (!reader.value.startsWith(value, reader.position)) {
                throw new ParseError([value.charAt(0)]);
            }
            reader.position += value.length;
            return value;
        },
        stringify() {
            return value;
        },
    }),
    digits: (): Format<number> => ({
        parse(reader) {
            const match = reader.value.substring(reader.position).match(/^\d+/);
            if (!match) {
                throw new ParseError("0123456789".split(""));
            }
            reader.position += match[0].length;
            return Number.parseInt(match[0], 10);
        },
        stringify(value) {
            return value.toString();
        },
    }),
    union: <const T extends readonly Format<unknown>[]>(
        ...args: T
    ): Format<UnionResult<T>> => ({
        parse(reader) {
            const expected: string[] = [];
            for (const format of args) {
                try {
                    return format.parse(reader) as UnionResult<T>;
                } catch (e) {
                    if (e instanceof ParseError) {
                        expected.push(...e.expected);
                    } else {
                        throw e;
                    }
                }
            }
            throw new ParseError(expected);
        },
        stringify(value) {
            for (const format of args) {
                try {
                    const result = format.stringify(value);
                    // Parse the result to make sure it is valid
                    format.parse({ value: result, position: 0 });
                } catch {
                    // ignore
                }
            }
            throw new Error("No format matches");
        },
    }),
    separated: <T>(
        separator: string,
        format: Format<T>,
        { min = 0, max = Infinity }: { min?: number; max?: number } = {},
    ): Format<T[]> => ({
        parse(reader: Reader) {
            const result: T[] = [];
            while (true) {
                try {
                    result.push(format.parse(reader));
                    if (result.length === max) {
                        break;
                    }
                } catch (e) {
                    if (result.length < min) {
                        throw e;
                    } else {
                        break;
                    }
                }

                if (reader.value.startsWith(separator, reader.position)) {
                    reader.position += separator.length;
                } else if (result.length < min) {
                    throw new ParseError([separator.charAt(0)]);
                } else {
                    break;
                }
            }
            return result;
        },
        stringify(value) {
            return value.map((item) => format.stringify(item)).join(separator);
        },
    }),
    repeated: <T>(format: Format<T>): Format<T[]> => ({
        parse(reader: Reader) {
            const result: T[] = [];
            while (true) {
                try {
                    result.push(format.parse(reader));
                } catch {
                    break;
                }
            }
            return result;
        },
        stringify(value: T[]) {
            return value.map((item) => format.stringify(item)).join("");
        },
    }),
    sequence: <
        const T extends readonly (
            | Format<unknown>
            | { name: string; format: Format<unknown> }
        )[],
    >(
        ...args: T
    ): Format<SequenceResult<T>> => ({
        parse(reader: Reader) {
            const result: Record<string, unknown> = {};
            for (const part of args) {
                if ("name" in part) {
                    result[part.name] = part.format.parse(reader);
                } else {
                    void part.parse(reader);
                }
            }
            return result as SequenceResult<T>;
        },
        stringify: (value: SequenceResult<T>) => {
            let result = "";
            for (const part of args) {
                if ("name" in part) {
                    result += part.format.stringify(
                        value[part.name as keyof typeof value],
                    );
                }
            }
            return result;
        },
    }),
    map: <T, R>(
        format: Format<T>,
        map: (value: T) => R,
        reverse: (value: R) => T,
    ): Format<R> => ({
        parse(reader: Reader) {
            return map(format.parse(reader));
        },
        stringify(value: R) {
            return format.stringify(reverse(value));
        },
    }),
} satisfies Record<string, (...args: never) => Format<unknown>>;
