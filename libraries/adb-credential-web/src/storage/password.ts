import { encodeUtf8 } from "@yume-chan/adb";
import type { MaybePromiseLike } from "@yume-chan/async";
import {
    buffer,
    struct,
    u16,
    Uint8ArrayExactReadable,
} from "@yume-chan/struct";

import type { TangoDataStorage } from "./type.js";

const PBKDF2_SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;
const AES_IV_LENGTH = 32;

const Bundle = struct(
    {
        pbkdf2Salt: buffer(PBKDF2_SALT_LENGTH),
        aesIv: buffer(AES_IV_LENGTH),
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
        salt = new Uint8Array(PBKDF2_SALT_LENGTH);
        crypto.getRandomValues(salt);
    }

    const aesKey = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256",
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
    );

    return { salt, aesKey };
}

export class TangoPasswordProtectedStorage implements TangoDataStorage {
    readonly #storage: TangoDataStorage;
    readonly #requestPassword: TangoPasswordProtectedStorage.RequestPassword;

    constructor(
        storage: TangoDataStorage,
        requestPassword: TangoPasswordProtectedStorage.RequestPassword,
    ) {
        this.#storage = storage;
        this.#requestPassword = requestPassword;
    }

    async save(data: Uint8Array<ArrayBuffer>): Promise<undefined> {
        const password = await this.#requestPassword("save");
        const { salt, aesKey } = await deriveAesKey(password);

        const iv = new Uint8Array(AES_IV_LENGTH);
        crypto.getRandomValues(iv);

        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            aesKey,
            data,
        );

        const bundle = Bundle.serialize({
            pbkdf2Salt: salt,
            aesIv: iv,
            encrypted: new Uint8Array(encrypted),
        });

        await this.#storage.save(bundle);
    }

    async *load(): AsyncGenerator<Uint8Array, void, void> {
        for await (const serialized of this.#storage.load()) {
            const bundle = Bundle.deserialize(
                new Uint8ArrayExactReadable(serialized),
            );

            const password = await this.#requestPassword("load");
            const { aesKey } = await deriveAesKey(
                password,
                bundle.pbkdf2Salt as Uint8Array<ArrayBuffer>,
            );

            try {
                const decrypted = await crypto.subtle.decrypt(
                    {
                        name: "AES-GCM",
                        iv: bundle.aesIv as Uint8Array<ArrayBuffer>,
                    },
                    aesKey,
                    bundle.encrypted as Uint8Array<ArrayBuffer>,
                );

                yield new Uint8Array(decrypted);
            } catch (e) {
                if (e instanceof DOMException && e.name === "OperationError") {
                    throw new TangoPasswordProtectedStorage.PasswordIncorrectError();
                }

                throw e;
            }
        }
    }
}

export namespace TangoPasswordProtectedStorage {
    export type RequestPassword = (
        reason: "save" | "load",
    ) => MaybePromiseLike<string>;

    export class PasswordIncorrectError extends Error {
        constructor() {
            super("Password incorrect");
        }
    }
}
