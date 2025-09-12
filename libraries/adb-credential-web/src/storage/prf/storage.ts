import {
    buffer,
    struct,
    u16,
    Uint8ArrayExactReadable,
} from "@yume-chan/struct";

import type { TangoKey, TangoKeyStorage } from "../type.js";

import type { TangoPrfSource } from "./source.js";

// PRF generally uses FIDO HMAC secret extension, which uses HMAC with SHA-256,
// and this input is used as salt, so should be 32 bytes
const PrfInputLength = 32;
const HkdfInfoLength = 32;
// We use HMAC with SHA-512, so should be 64 bytes
const HkdfSaltLength = 64;
// AES-GCM recommends 12-byte (96-bit) IV for performance and interoperability
const AesIvLength = 12;

async function deriveAesKey(
    source: BufferSource,
    info: Uint8Array<ArrayBuffer>,
    salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
    const baseKey = await crypto.subtle.importKey(
        "raw",
        source,
        "HKDF",
        false,
        ["deriveKey"],
    );

    return await crypto.subtle.deriveKey(
        {
            name: "HKDF",
            hash: "SHA-512",
            info,
            salt,
        } satisfies globalThis.HkdfParams,
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
}

function toUint8Array(source: BufferSource) {
    if (source instanceof ArrayBuffer) {
        return new Uint8Array(source);
    }
    return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
}

const Bundle = struct(
    {
        id: buffer(u16),
        prfInput: buffer(PrfInputLength),
        hkdfInfo: buffer(HkdfInfoLength),
        hkdfSalt: buffer(HkdfSaltLength),
        aesIv: buffer(AesIvLength),
        encrypted: buffer(u16),
    },
    { littleEndian: true },
);

/**
 * A `TangoDataStorage` that encrypts and decrypts data using PRF
 */
export class TangoPrfStorage implements TangoKeyStorage {
    readonly #storage: TangoKeyStorage;
    readonly #source: TangoPrfSource;
    #prevId: Uint8Array<ArrayBuffer> | undefined;

    /**
     * Creates a new instance of `TangoPrfStorage`
     *
     * @param storage Another `TangoDataStorage` to store and retrieve the encrypted data
     * @param source The `TangoPrfSource` to generate PRF output
     */
    constructor(storage: TangoKeyStorage, source: TangoPrfSource) {
        this.#storage = storage;
        this.#source = source;
    }

    async save(
        privateKey: Uint8Array<ArrayBuffer>,
        name: string | undefined,
    ): Promise<undefined> {
        const prfInput = new Uint8Array(PrfInputLength);
        crypto.getRandomValues(prfInput);

        // Maybe reuse the credential, but use different PRF input and HKDF params
        let id: Uint8Array<ArrayBuffer>;
        let prfOutput: BufferSource;
        if (this.#prevId) {
            prfOutput = await this.#source.get(this.#prevId, prfInput);
            id = this.#prevId;
        } else {
            ({ output: prfOutput, id } = await this.#source.create(prfInput));
            this.#prevId = id;
        }

        const info = new Uint8Array(HkdfInfoLength);
        crypto.getRandomValues(info);

        const salt = new Uint8Array(HkdfSaltLength);
        crypto.getRandomValues(salt);

        const aesKey = await deriveAesKey(prfOutput, info, salt);

        const iv = new Uint8Array(AesIvLength);
        crypto.getRandomValues(iv);

        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            aesKey,
            privateKey,
        );

        const bundle = Bundle.serialize({
            id,
            prfInput,
            hkdfInfo: info,
            hkdfSalt: salt,
            aesIv: iv,
            encrypted: new Uint8Array(encrypted),
        });

        await this.#storage.save(bundle, name);

        // Clear secret memory
        //   * No way to clear `aesKey`
        //   * `info`, `salt`, `iv`, `encrypted` and `bundle` are not secrets
        //   * `data` is owned by caller and will be cleared by caller
        //   * Need to clear `prfOutput`
        toUint8Array(prfOutput).fill(0);
    }

    async *load(): AsyncGenerator<TangoKey, void, void> {
        for await (const {
            privateKey: serialized,
            name,
        } of this.#storage.load()) {
            const bundle = Bundle.deserialize(
                new Uint8ArrayExactReadable(serialized),
            );

            const prfOutput = await this.#source.get(
                bundle.id as Uint8Array<ArrayBuffer>,
                bundle.prfInput as Uint8Array<ArrayBuffer>,
            );

            this.#prevId = bundle.id as Uint8Array<ArrayBuffer>;

            const aesKey = await deriveAesKey(
                prfOutput,
                bundle.hkdfInfo as Uint8Array<ArrayBuffer>,
                bundle.hkdfSalt as Uint8Array<ArrayBuffer>,
            );

            const decrypted = await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: bundle.aesIv as Uint8Array<ArrayBuffer>,
                },
                aesKey,
                bundle.encrypted as Uint8Array<ArrayBuffer>,
            );

            yield { privateKey: new Uint8Array(decrypted), name };

            // Clear secret memory
            //   * No way to clear `aesKey`
            //   * `info`, `salt`, `iv`, `encrypted` and `bundle` are not secrets
            //   * `data` is owned by caller and will be cleared by caller
            //   * Caller is not allowed to use `decrypted` after `yield` returns
            //   * Need to clear `prfOutput`
            toUint8Array(prfOutput).fill(0);
            new Uint8Array(decrypted).fill(0);
        }
    }
}
