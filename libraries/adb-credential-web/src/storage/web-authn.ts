import {
    buffer,
    struct,
    u16,
    Uint8ArrayExactReadable,
} from "@yume-chan/struct";

import type { TangoDataStorage } from "./type.js";

export const PRF_INPUT_LENGTH = 32;
export const HKDF_INFO_LENGTH = 32;
export const HKDF_SALT_LENGTH = 32;
export const AES_IV_LENGTH = 32;

const Bundle = struct(
    {
        credentialId: buffer(u16),
        prfInput: buffer(PRF_INPUT_LENGTH),
        hkdfInfo: buffer(HKDF_INFO_LENGTH),
        hkdfSalt: buffer(HKDF_SALT_LENGTH),
        aesIv: buffer(AES_IV_LENGTH),
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
        const info = new Uint8Array(HKDF_INFO_LENGTH);
        crypto.getRandomValues(info);

        const salt = new Uint8Array(HKDF_SALT_LENGTH);
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
            hash: "SHA-256",
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

async function getAesKeyFromAssertion(
    credentialId: BufferSource,
    prfInput: Uint8Array<ArrayBuffer>,
    hkdfParams?: HkdfParams,
): Promise<AesKey> {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    let assertion;
    try {
        assertion = await navigator.credentials.get({
            publicKey: {
                allowCredentials: [{ type: "public-key", id: credentialId }],
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

    return await deriveAesKey(prfOutput.results.first, hkdfParams);
}

async function createAesKeyFromAttestation(
    prfInput: Uint8Array<ArrayBuffer>,
    appName: string,
    userName: string,
) {
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

    let aesKey: AesKey;
    if (prf.results) {
        aesKey = await deriveAesKey(prf.results.first);
    } else {
        aesKey = await getAesKeyFromAssertion(attestation.rawId, prfInput);
    }

    return { aesKey, credentialId: new Uint8Array(attestation.rawId) };
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
    #availableCredentialId: Uint8Array<ArrayBuffer> | undefined;

    /**
     * Create a new instance of WebAuthnStorage
     * @param storage The storage to save and load the encrypted key
     * @param appName Name of your website visible in Passkey manager
     * @param userName Display name of the credential visible in Passkey manager
     */
    constructor(storage: TangoDataStorage, appName: string, userName: string) {
        this.#storage = storage;
        this.#appName = appName;
        this.#userName = userName;
    }

    async save(data: Uint8Array<ArrayBuffer>): Promise<undefined> {
        try {
            const prfInput = new Uint8Array(PRF_INPUT_LENGTH);
            crypto.getRandomValues(prfInput);

            let credentialId: Uint8Array<ArrayBuffer>;
            let aesKey: AesKey;
            if (this.#availableCredentialId) {
                credentialId = this.#availableCredentialId;
                aesKey = await getAesKeyFromAssertion(
                    this.#availableCredentialId,
                    prfInput,
                );
            } else {
                ({ aesKey, credentialId } = await createAesKeyFromAttestation(
                    prfInput,
                    this.#appName,
                    this.#userName,
                ));
                this.#availableCredentialId = credentialId;
            }

            const iv = new Uint8Array(AES_IV_LENGTH);
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
        } catch (e) {
            console.warn(e);
            throw e;
        }
    }

    async *load(): AsyncGenerator<Uint8Array, void, void> {
        for await (const serialized of this.#storage.load()) {
            const bundle = Bundle.deserialize(
                new Uint8ArrayExactReadable(serialized),
            );

            const aesKey = await getAesKeyFromAssertion(
                bundle.credentialId as Uint8Array<ArrayBuffer>,
                bundle.prfInput as Uint8Array<ArrayBuffer>,
                {
                    info: bundle.hkdfInfo as Uint8Array<ArrayBuffer>,
                    salt: bundle.hkdfSalt as Uint8Array<ArrayBuffer>,
                },
            );

            this.#availableCredentialId =
                bundle.credentialId as Uint8Array<ArrayBuffer>;

            const decrypted = await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: bundle.aesIv as Uint8Array<ArrayBuffer>,
                },
                aesKey.key,
                bundle.encrypted as Uint8Array<ArrayBuffer>,
            );

            yield new Uint8Array(decrypted);
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
