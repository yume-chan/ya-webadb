import { AccumulateStream } from "@yume-chan/stream-extra";
import { TextDecoder } from "@yume-chan/struct";

export function escapeArg(s: string) {
    let result = "";
    result += `'`;

    let base = 0;
    while (true) {
        const found = s.indexOf(`'`, base);
        if (found === -1) {
            result += s.substring(base);
            break;
        }
        result += s.substring(base, found);
        // a'b becomes 'a'\'b', which is 'a' + \' + 'b'
        // (quoted string 'a', escaped single quote, and quoted string 'b')
        result += String.raw`'\''`;
        base = found + 1;
    }

    result += `'`;
    return result;
}

/**
 * Split the command.
 *
 * Quotes and escaped characters are supported, and will be returned as-is.
 * @param input The input command
 * @returns An array of string containing the arguments
 */
export function splitCommand(input: string): string[] {
    const result: string[] = [];
    let quote: string | undefined;
    let isEscaped = false;
    let start = 0;

    for (let i = 0, len = input.length; i < len; i += 1) {
        if (isEscaped) {
            isEscaped = false;
            continue;
        }

        const char = input.charAt(i);
        switch (char) {
            case " ":
                if (!quote && i !== start) {
                    result.push(input.substring(start, i));
                    start = i + 1;
                }
                break;
            case "'":
            case '"':
                if (!quote) {
                    quote = char;
                } else if (char === quote) {
                    quote = undefined;
                }
                break;
            case "\\":
                isEscaped = true;
                break;
        }
    }

    if (start < input.length) {
        result.push(input.substring(start));
    }

    return result;
}

// Omit `Symbol.toStringTag` so it's incompatible with `Promise`.
// It can't be returned from async function like `Promise`s.
export type LazyPromise<T, U> = Omit<Promise<T>, typeof Symbol.toStringTag> & U;

/**
 * Creates a `Promise`-like object that lazily computes the result
 * only when it's being used as a `Promise`.
 *
 * For example, if an API returns a value `p` of type `Promise<T> & { asU(): Promise<U> }`,
 * and the user calls `p.asU()` instead of using it as a `Promise` (`p.then()`, `await p`, etc.),
 * is unnecessary to compute the result `T` (unless `asU` also depends on it).
 *
 * By using `createLazyPromise(computeT, { asU: computeU })`,
 * `computeT` will only run when `p` is used as a `Promise`.
 *
 * Note that the result object can't be returned from an async function,
 * as async functions always creates a new `Promise` with the return value,
 * which runs `initializer` immediately, and discards any extra `methods` attached.
 * @param initializer
 * The initializer function when the result object is being used as a `Promise`.
 *
 * The result value will be cached.
 * @param methods Any extra methods to add to the result object
 * @returns
 * A `Promise`-like object that runs `initializer` when used as a `Promise`, and contains `methods`.
 */
export function createLazyPromise<
    T,
    U extends Record<PropertyKey, () => unknown>,
>(initializer: () => Promise<T>, methods: U): LazyPromise<T, U> {
    let promise: Promise<T> | undefined;

    const getOrCreatePromise = () => {
        if (!promise) {
            promise = initializer();
        }
        return promise;
    };

    const result = {
        // biome-ignore lint/suspicious/noThenProperty: This object is intentionally thenable
        then(onfulfilled, onrejected) {
            return getOrCreatePromise().then(onfulfilled, onrejected);
        },
        // biome-ignore lint/suspicious/noThenProperty: This object is intentionally thenable
        catch(onrejected) {
            return getOrCreatePromise().catch(onrejected);
        },
        // biome-ignore lint/suspicious/noThenProperty: This object is intentionally thenable
        finally(onfinally) {
            return getOrCreatePromise().finally(onfinally);
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    } satisfies LazyPromise<T, {}> as LazyPromise<T, U>;

    for (const [key, value] of Object.entries(methods)) {
        Object.defineProperty(result, key, {
            configurable: true,
            writable: true,
            enumerable: false,
            value,
        });
    }

    return result;
}

export class ToArrayStream<T> extends AccumulateStream<T, T[]> {
    constructor() {
        super(
            [],
            (chunk, current) => {
                current.push(chunk);
                return current;
            },
            (output) => output,
        );
    }
}

export function decodeUtf8Chunked(chunks: Uint8Array[]): string {
    // PERF: `TextDecoder`'s `stream` mode can decode from `chunks` directly.
    // This avoids an extra allocation and copy.
    const decoder = new TextDecoder();
    let output = "";
    for (const chunk of chunks) {
        output += decoder.decode(chunk, { stream: true });
    }
    output += decoder.decode();
    return output;
}
