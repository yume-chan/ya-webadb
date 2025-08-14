import type { TangoPrfSource } from "./source.js";

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
        throw new NotSupportedError();
    }

    return prf;
}

class NotSupportedError extends Error {
    constructor() {
        super("PRF extension is not supported");
    }
}

class AssertionFailedError extends Error {
    constructor() {
        super("Assertion failed");
    }
}

export class TangoWebAuthnPrfSource implements TangoPrfSource {
    static NotSupportedError = NotSupportedError;
    static AssertionFailedError = AssertionFailedError;

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
            throw new NotSupportedError();
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
            throw new AssertionFailedError();
        }

        checkCredential(assertion);

        const prfOutput = getPrfOutput(assertion);
        if (!prfOutput.results) {
            throw new NotSupportedError();
        }

        return prfOutput.results.first;
    }
}

export namespace TangoWebAuthnPrfSource {
    export type NotSupportedError = typeof NotSupportedError;
    export type AssertionFailedError = typeof AssertionFailedError;
}
