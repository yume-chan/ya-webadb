import type { MaybeError } from "@yume-chan/adb";
import { encodeUtf8 } from "@yume-chan/adb";
import type { MaybePromiseLike } from "@yume-chan/async";
import {
    buffer,
    struct,
    u16,
    Uint8ArrayExactReadable,
} from "@yume-chan/struct";

import type { TangoKey, TangoKeyStorage } from "./type.js";

const Pbkdf2SaltLength = 16;
const Pbkdf2Iterations = 1_000_000;
// AES-GCM recommends 12-byte (96-bit) IV for performance and interoperability
const AesIvLength = 12;

const Bundle = struct(
    {
        pbkdf2Salt: buffer(Pbkdf2SaltLength),
        aesIv: buffer(AesIvLength),
        encrypted: buffer(u16),
    },
    { littleEndian: true },
);

async function deriveAesKey(password: string, salt?: Uint8Array<ArrayBuffer>) {
    const baseKey = await crypto.subtle.importKey(
        "raw",
        encodeUtf8(password),
        "PBKDF2",
        false,
        ["deriveKey"],
    );

    if (!salt) {
        salt = new Uint8Array(Pbkdf2SaltLength);
        crypto.getRandomValues(salt);
    }

    const aesKey = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: Pbkdf2Iterations,
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
    constructor() {
        super("Password incorrect");
    }
}

export class TangoPasswordProtectedStorage implements TangoKeyStorage {
    static PasswordIncorrectError = PasswordIncorrectError;

    readonly #storage: TangoKeyStorage;
    readonly #requestPassword: TangoPasswordProtectedStorage.RequestPassword;

    constructor(
        storage: TangoKeyStorage,
        requestPassword: TangoPasswordProtectedStorage.RequestPassword,
    ) {
        this.#storage = storage;
        this.#requestPassword = requestPassword;
    }

    async save(
        privateKey: Uint8Array<ArrayBuffer>,
        name: string | undefined,
    ): Promise<undefined> {
        const password = await this.#requestPassword("save");
        const { salt, aesKey } = await deriveAesKey(password);

        const iv = new Uint8Array(AesIvLength);
        crypto.getRandomValues(iv);

        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            aesKey,
            privateKey,
        );

        const bundle = Bundle.serialize({
            pbkdf2Salt: salt,
            aesIv: iv,
            encrypted: new Uint8Array(encrypted),
        });

        await this.#storage.save(bundle, name);

        // Clear secret memory
        //   * No way to clear `password` and `aesKey`
        //   * `salt`, `iv`, `encrypted` and `bundle` are not secrets
        //   * `data` is owned by caller and will be cleared by caller
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

                const password = await this.#requestPassword("load");
                const { aesKey } = await deriveAesKey(
                    password,
                    bundle.pbkdf2Salt as Uint8Array<ArrayBuffer>,
                );

                const decrypted = await crypto.subtle.decrypt(
                    {
                        name: "AES-GCM",
                        iv: bundle.aesIv as Uint8Array<ArrayBuffer>,
                    },
                    aesKey,
                    bundle.encrypted as Uint8Array<ArrayBuffer>,
                );

                yield {
                    privateKey: new Uint8Array(decrypted),
                    name,
                };

                // Clear secret memory
                //   * No way to clear `password` and `aesKey`
                //   * all values in `bundle` are not secrets
                //   * Caller is not allowed to use `decrypted` after `yield` returns
                new Uint8Array(decrypted).fill(0);
            } catch (e) {
                if (e instanceof DOMException && e.name === "OperationError") {
                    yield new PasswordIncorrectError();
                    continue;
                }

                if (e instanceof Error) {
                    yield e;
                    continue;
                }

                yield new Error(String(e));
            }
        }
    }
}

export namespace TangoPasswordProtectedStorage {
    export type RequestPassword = (
        reason: "save" | "load",
    ) => MaybePromiseLike<string>;

    export type PasswordIncorrectError = typeof PasswordIncorrectError;
}
