import {
    buffer,
    struct,
    u16,
    Uint8ArrayExactReadable,
} from "@yume-chan/struct";

import type { TangoDataStorage } from "./type.js";

// PRF generally uses FIDO HMAC secret extension, which uses HMAC with SHA-256,
// and this input is used as salt, so should be 32 bytes
const PrfInputLength = 32;
const HkdfInfoLength = 32;
// We use HMAC with SHA-512, so should be 64 bytes
const HkdfSaltLength = 64;
// Should be at least 16 bytes for security
const AesIvLength = 32;

export interface TangoPrfSource {
    create(input: Uint8Array<ArrayBuffer>): Promise<{
        output: BufferSource;
        id: Uint8Array<ArrayBuffer>;
    }>;

    get(
        id: BufferSource,
        input: Uint8Array<ArrayBuffer>,
    ): Promise<BufferSource>;
}

function checkCredential(
    credential: Credential | null,
): asserts credential is PublicKeyCredential {
    if (!credential || !(credential instanceof PublicKeyCredential)) {
        throw new Error("Can't create credential");
    }
}

function getPrfOutput(credential: PublicKeyCredential) {
    const extensions = credential.getClientExtensionResults();

    const prf = extensions["prf"];
    if (!prf) {
        throw new TangoWebAuthnPrfSource.NotSupportedError();
    }

    return prf;
}

export class TangoWebAuthnPrfSource implements TangoPrfSource {
    static async isSupported(): Promise<boolean> {
        if (typeof PublicKeyCredential === "undefined") {
            return false;
        }

        if (!PublicKeyCredential.getClientCapabilities) {
            return false;
        }

        const clientCapabilities =
            await PublicKeyCredential.getClientCapabilities();
        if (!clientCapabilities["extension:prf"]) {
            return false;
        }

        return true;
    }

    readonly #appName: string;
    readonly #userName: string;

    /**
     * Create a new instance of TangoWebAuthnPrfSource
     * @param appName Name of your website shows in Passkey manager
     * @param userName Display name of the credential shows in Passkey manager
     */
    constructor(appName: string, userName: string) {
        this.#appName = appName;
        this.#userName = userName;
    }

    async create(input: Uint8Array<ArrayBuffer>): Promise<{
        output: BufferSource;
        id: Uint8Array<ArrayBuffer>;
    }> {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        const attestation = await navigator.credentials.create({
            publicKey: {
                challenge,
                extensions: { prf: { eval: { first: input } } },
                pubKeyCredParams: [
                    { type: "public-key", alg: -7 },
                    { type: "public-key", alg: -257 },
                ],
                rp: { name: this.#appName },
                user: {
                    id: challenge,
                    name: this.#userName,
                    displayName: this.#userName,
                },
            },
        });
        checkCredential(attestation);

        const prf = getPrfOutput(attestation);
        if (prf.enabled === undefined) {
            throw new TangoWebAuthnPrfSource.NotSupportedError();
        }

        const id = new Uint8Array(attestation.rawId);

        if (prf.results) {
            return { output: prf.results.first, id };
        }

        // Some authenticators only support getting PRF in assertion
        const output = await this.get(id, input);
        return { output, id };
    }

    async get(
        id: BufferSource,
        input: Uint8Array<ArrayBuffer>,
    ): Promise<BufferSource> {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        let assertion;
        try {
            assertion = await navigator.credentials.get({
                publicKey: {
                    allowCredentials: [{ type: "public-key", id }],
                    challenge,
                    extensions: { prf: { eval: { first: input } } },
                },
            });
        } catch {
            throw new TangoWebAuthnPrfSource.AssertionFailedError();
        }

        checkCredential(assertion);

        const prfOutput = getPrfOutput(assertion);
        if (!prfOutput.results) {
            throw new TangoWebAuthnPrfSource.NotSupportedError();
        }

        return prfOutput.results.first;
    }
}

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

export class TangoPrfStorage implements TangoDataStorage {
    readonly #storage: TangoDataStorage;
    readonly #source: TangoPrfSource;
    #prevId: Uint8Array<ArrayBuffer> | undefined;

    constructor(storage: TangoDataStorage, source: TangoPrfSource) {
        this.#storage = storage;
        this.#source = source;
    }

    async save(data: Uint8Array<ArrayBuffer>): Promise<undefined> {
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
            data,
        );

        const bundle = Bundle.serialize({
            id,
            prfInput,
            hkdfInfo: info,
            hkdfSalt: salt,
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

            yield new Uint8Array(decrypted);

            new Uint8Array(decrypted).fill(0);
        }
    }
}

export namespace TangoWebAuthnPrfSource {
    export class NotSupportedError extends Error {
        constructor() {
            super("PRF extension is not supported");
        }
    }

    export class AssertionFailedError extends Error {
        constructor() {
            super("Assertion failed");
        }
    }
}
