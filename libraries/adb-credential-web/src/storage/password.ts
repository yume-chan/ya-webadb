import type { MaybeError } from "@yume-chan/adb";
import { encodeUtf8, toLocalUint8Array } from "@yume-chan/adb";
import type { MaybePromiseLike } from "@yume-chan/async";
import {
    buffer,
    struct,
    u16,
    u32,
    u8,
    Uint8ArrayExactReadable,
} from "@yume-chan/struct";

import type { TangoKey, TangoKeyStorage } from "./type.js";

const DefaultPbkdf2SaltLength = 16; // Recommended
const MinimalPbkdf2SaltLength = 8; // Not recommended but still could be considered secure
const MaximalPbkdf2SaltLength = 255; // Max length can be stored in `Bundle`

const DefaultPbkdf2Iterations = 1_000_000; // Very secure according to OWASP Cheat Sheet
const MinimalPbkdf2Iterations = 10_000; // Not recommended but still could be considered secure
const MaximalPbkdf2Iterations = 4294967295; // 2^32 - 1, max value can be stored in `Bundle`

const DefaultAesIvLength = 12; // 12 bytes (96 bits) is the native IV length
const MinimalAesIvLength = 1; // Any value except 12 is not recommended, but could work
const MaximalAesIvLength = 255; // Max length can be stored in `Bundle`

const Bundle = struct(
    {
        pbkdf2Salt: buffer(u8),
        pbkdf2Iterations: u32,
        aesIv: buffer(u8),
        encrypted: buffer(u16),
    },
    { littleEndian: true },
);

async function deriveAesKey(
    password: string,
    saltOrLength: Uint8Array<ArrayBuffer> | number,
    iterations: number,
) {
    const baseKey = await crypto.subtle.importKey(
        "raw",
        encodeUtf8(password),
        "PBKDF2",
        false,
        ["deriveKey"],
    );

    let salt: Uint8Array<ArrayBuffer>;
    if (typeof saltOrLength === "number") {
        salt = new Uint8Array(saltOrLength);
        crypto.getRandomValues(salt);
    } else {
        salt = saltOrLength;
    }

    const aesKey = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations,
            hash: "SHA-256",
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );

    return { salt, aesKey };
}

class PasswordIncorrectError extends Error {
    #keyName: string | undefined;
    get keyName() {
        return this.#keyName;
    }

    constructor(keyName: string | undefined) {
        super("Password incorrect");
        this.#keyName = keyName;
    }
}

// eslint-disable-next-line @typescript-eslint/max-params
function checkIntegerRange(
    name: string,
    value: number | undefined,
    defaultValue: number,
    min: number,
    max: number,
): number {
    if (value === undefined) {
        return defaultValue;
    }
    if (!Number.isInteger(value) || value < min || value > max) {
        throw new Error(`${name} must be an integer between ${min} and ${max}`);
    }
    return value;
}

export class TangoPasswordProtectedStorage implements TangoKeyStorage {
    static PasswordIncorrectError = PasswordIncorrectError;

    readonly #storage: TangoKeyStorage;
    readonly #requestPassword: TangoPasswordProtectedStorage.RequestPassword;
    readonly #pbkdf2SaltLength: number;
    readonly #pbkdf2Iterations: number;
    readonly #aesIvLength: number;

    constructor(options: {
        storage: TangoKeyStorage;
        requestPassword: TangoPasswordProtectedStorage.RequestPassword;
        pbkdf2SaltLength?: number | undefined;
        pbkdf2Iterations?: number | undefined;
        aesIvLength?: number | undefined;
    }) {
        this.#storage = options.storage;
        this.#requestPassword = options.requestPassword;

        this.#pbkdf2SaltLength = checkIntegerRange(
            "pbkdf2SaltLength",
            options.pbkdf2SaltLength,
            DefaultPbkdf2SaltLength,
            MinimalPbkdf2SaltLength,
            MaximalPbkdf2SaltLength,
        );

        this.#pbkdf2Iterations = checkIntegerRange(
            "pbkdf2Iterations",
            options.pbkdf2Iterations,
            DefaultPbkdf2Iterations,
            MinimalPbkdf2Iterations,
            MaximalPbkdf2Iterations,
        );

        this.#aesIvLength = checkIntegerRange(
            "aesIvLength",
            options.aesIvLength,
            DefaultAesIvLength,
            MinimalAesIvLength,
            MaximalAesIvLength,
        );
    }

    async save(
        privateKey: Uint8Array,
        name: string | undefined,
    ): Promise<undefined> {
        const password = await this.#requestPassword("save", name);
        const { salt, aesKey } = await deriveAesKey(
            password,
            this.#pbkdf2SaltLength,
            this.#pbkdf2Iterations,
        );

        const iv = new Uint8Array(this.#aesIvLength);
        crypto.getRandomValues(iv);

        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            aesKey,
            toLocalUint8Array(privateKey),
        );

        const bundle = Bundle.serialize({
            pbkdf2Salt: salt,
            pbkdf2Iterations: this.#pbkdf2Iterations,
            aesIv: iv,
            encrypted: new Uint8Array(encrypted),
        });

        await this.#storage.save(bundle, name);

        // Clear secret memory
        //   * No way to clear `password` and `aesKey`
        //   * `salt`, `iv`, `encrypted` and `bundle` are not secrets
        //   * `privateKey` is owned by caller and will be cleared by caller
    }

    async *load(): AsyncGenerator<MaybeError<TangoKey>, void, void> {
        for await (const result of this.#storage.load()) {
            if (result instanceof Error) {
                yield result;
                continue;
            }

            const { privateKey: serialized, name } = result;

            try {
                const bundle = Bundle.deserialize(
                    new Uint8ArrayExactReadable(serialized),
                );

                const password = await this.#requestPassword("load", name);
                const { aesKey } = await deriveAesKey(
                    password,
                    bundle.pbkdf2Salt as Uint8Array<ArrayBuffer>,
                    bundle.pbkdf2Iterations,
                );

                const decrypted = await crypto.subtle.decrypt(
                    {
                        name: "AES-GCM",
                        iv: bundle.aesIv as Uint8Array<ArrayBuffer>,
                    },
                    aesKey,
                    bundle.encrypted as Uint8Array<ArrayBuffer>,
                );

                try {
                    yield {
                        privateKey: new Uint8Array(decrypted),
                        name,
                    };
                } finally {
                    // Clear secret memory
                    //   * No way to clear `password` and `aesKey`
                    //   * all values in `bundle` are not secrets
                    //   * Caller is not allowed to use `decrypted` after `yield` returns
                    new Uint8Array(decrypted).fill(0);
                }
            } catch (e) {
                if (e instanceof DOMException && e.name === "OperationError") {
                    yield new PasswordIncorrectError(name);
                    continue;
                }

                yield e instanceof Error
                    ? e
                    : new Error(String(e), { cause: e });
            }
        }
    }
}

export namespace TangoPasswordProtectedStorage {
    export type RequestPassword = (
        reason: "save" | "load",
        name: string | undefined,
    ) => MaybePromiseLike<string>;

    export type PasswordIncorrectError = typeof PasswordIncorrectError;
}
