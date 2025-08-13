import {
    buffer,
    struct,
    u16,
    Uint8ArrayExactReadable,
} from "@yume-chan/struct";

import type { TangoDataStorage } from "./type.js";

// PRF generally uses FIDO HMAC secret extension, which uses HMAC with SHA-256,
// and this input is used as salt, so should be 32 bytes
export const PrfInputLength = 32;
export const HkdfInfoLength = 32;
// We use HMAC with SHA-512, so should be 64 bytes
export const HkdfSaltLength = 64;
// Should be at least 16 bytes for security
export const AesIvLength = 32;

const Bundle = struct(
    {
        credentialId: buffer(u16),
        prfInput: buffer(PrfInputLength),
        hkdfInfo: buffer(HkdfInfoLength),
        hkdfSalt: buffer(HkdfSaltLength),
        aesIv: buffer(AesIvLength),
        encrypted: buffer(u16),
    },
    { littleEndian: true },
);

interface HkdfParams {
    info: Uint8Array<ArrayBuffer>;
    salt: Uint8Array<ArrayBuffer>;
}

interface AesKey extends HkdfParams {
    key: CryptoKey;
}

async function deriveAesKey(
    source: BufferSource,
    params?: HkdfParams,
): Promise<AesKey> {
    if (!params) {
        const info = new Uint8Array(HkdfInfoLength);
        crypto.getRandomValues(info);

        const salt = new Uint8Array(HkdfSaltLength);
        crypto.getRandomValues(salt);

        params = { info, salt };
    }

    const baseKey = await crypto.subtle.importKey(
        "raw",
        source,
        "HKDF",
        false,
        ["deriveKey"],
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: "HKDF",
            hash: "SHA-512",
            ...params,
        } satisfies globalThis.HkdfParams,
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );

    return { ...params, key };
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
        throw new TangoWebAuthnStorage.NotSupportedError();
    }

    return prf;
}

export class TangoWebAuthnHandler {
    async create(
        prfInput: Uint8Array<ArrayBuffer>,
        appName: string,
        userName: string,
    ): Promise<{
        prfOutput: BufferSource;
        credentialId: Uint8Array<ArrayBuffer>;
    }> {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        const attestation = await navigator.credentials.create({
            publicKey: {
                challenge,
                extensions: { prf: { eval: { first: prfInput } } },
                pubKeyCredParams: [
                    { type: "public-key", alg: -7 },
                    { type: "public-key", alg: -257 },
                ],
                rp: { name: appName },
                user: {
                    id: challenge,
                    name: userName,
                    displayName: userName,
                },
            },
        });
        checkCredential(attestation);

        const prf = getPrfOutput(attestation);
        if (prf.enabled === undefined) {
            throw new TangoWebAuthnStorage.NotSupportedError();
        }

        const credentialId = new Uint8Array(attestation.rawId);

        if (prf.results) {
            return { prfOutput: prf.results.first, credentialId };
        }

        // Some authenticators only support getting PRF in assertion
        const prfOutput = await this.get(credentialId, prfInput);
        return { prfOutput, credentialId };
    }

    async get(credentialId: BufferSource, prfInput: Uint8Array<ArrayBuffer>) {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        let assertion;
        try {
            assertion = await navigator.credentials.get({
                publicKey: {
                    allowCredentials: [
                        { type: "public-key", id: credentialId },
                    ],
                    challenge,
                    extensions: { prf: { eval: { first: prfInput } } },
                },
            });
        } catch {
            throw new TangoWebAuthnStorage.AssertionFailedError();
        }

        checkCredential(assertion);

        const prfOutput = getPrfOutput(assertion);
        if (!prfOutput.results) {
            throw new TangoWebAuthnStorage.NotSupportedError();
        }

        return prfOutput.results.first;
    }
}

export class TangoWebAuthnStorage implements TangoDataStorage {
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

    readonly #storage: TangoDataStorage;
    readonly #appName: string;
    readonly #userName: string;
    readonly #handler: TangoWebAuthnHandler;
    #availableCredentialId: Uint8Array<ArrayBuffer> | undefined;

    /**
     * Create a new instance of WebAuthnStorage
     * @param storage The storage to save and load the encrypted key
     * @param appName Name of your website visible in Passkey manager
     * @param userName Display name of the credential visible in Passkey manager
     */
    constructor(
        storage: TangoDataStorage,
        appName: string,
        userName: string,
        handler = new TangoWebAuthnHandler(),
    ) {
        this.#storage = storage;
        this.#appName = appName;
        this.#userName = userName;
        this.#handler = handler;
    }

    async save(data: Uint8Array<ArrayBuffer>): Promise<undefined> {
        const prfInput = new Uint8Array(PrfInputLength);
        crypto.getRandomValues(prfInput);

        let credentialId: Uint8Array<ArrayBuffer>;
        let prfOutput: BufferSource;
        if (this.#availableCredentialId) {
            prfOutput = await this.#handler.get(
                this.#availableCredentialId,
                prfInput,
            );
            credentialId = this.#availableCredentialId;
        } else {
            ({ prfOutput, credentialId } = await this.#handler.create(
                prfInput,
                this.#appName,
                this.#userName,
            ));
            this.#availableCredentialId = credentialId;
        }

        // Maybe reuse the credential, but use different PRF input and HKDF params
        const aesKey = await deriveAesKey(prfOutput);

        const iv = new Uint8Array(AesIvLength);
        crypto.getRandomValues(iv);

        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            aesKey.key,
            data,
        );

        const bundle = Bundle.serialize({
            credentialId,
            prfInput,
            hkdfInfo: aesKey.info,
            hkdfSalt: aesKey.salt,
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

            const prfOutput = await this.#handler.get(
                bundle.credentialId as Uint8Array<ArrayBuffer>,
                bundle.prfInput as Uint8Array<ArrayBuffer>,
            );

            this.#availableCredentialId =
                bundle.credentialId as Uint8Array<ArrayBuffer>;

            const aesKey = await deriveAesKey(prfOutput, {
                info: bundle.hkdfInfo as Uint8Array<ArrayBuffer>,
                salt: bundle.hkdfSalt as Uint8Array<ArrayBuffer>,
            });

            const decrypted = await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: bundle.aesIv as Uint8Array<ArrayBuffer>,
                },
                aesKey.key,
                bundle.encrypted as Uint8Array<ArrayBuffer>,
            );

            yield new Uint8Array(decrypted);

            new Uint8Array(decrypted).fill(0);
        }
    }
}

export namespace TangoWebAuthnStorage {
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
