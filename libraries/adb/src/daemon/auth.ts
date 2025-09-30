import type { MaybePromiseLike } from "@yume-chan/async";
import { PromiseResolver } from "@yume-chan/async";
import type { WritableStreamDefaultWriter } from "@yume-chan/stream-extra";
import {
    AbortController,
    Consumable,
    WritableStream,
} from "@yume-chan/stream-extra";
import { decodeUtf8, EmptyUint8Array } from "@yume-chan/struct";

import { AdbDeviceFeatures, AdbFeature } from "../features.js";
import {
    calculateBase64EncodedLength,
    encodeBase64,
    encodeUtf8,
    md5Digest,
} from "../utils/index.js";

import type { SimpleRsaPrivateKey } from "./crypto.js";
import {
    adbGeneratePublicKey,
    adbGetPublicKeySize,
    rsaSign,
} from "./crypto.js";
import type { AdbPacketData, AdbPacketInit } from "./packet.js";
import { AdbCommand, calculateChecksum } from "./packet.js";
import type { AdbDaemonTransportInit } from "./transport.js";
import {
    ADB_DAEMON_DEFAULT_INITIAL_PAYLOAD_SIZE,
    AdbDaemonTransport,
} from "./transport.js";

export interface AdbPrivateKey extends SimpleRsaPrivateKey {
    name?: string | undefined;
}

export type MaybeError<T> = T | Error;

export type AdbKeyIterable =
    | Iterable<MaybeError<AdbPrivateKey>>
    | AsyncIterable<MaybeError<AdbPrivateKey>>;

export interface AdbCredentialManager {
    /**
     * Generates and stores a RSA private key with modulus length `2048` and public exponent `65537`.
     */
    generateKey(): MaybePromiseLike<AdbPrivateKey>;

    /**
     * Synchronously or asynchronously iterates through all stored RSA private keys.
     *
     * Each call to `iterateKeys` must return a different iterator that iterate through all stored keys.
     */
    iterateKeys(): AdbKeyIterable;
}

// https://cs.android.com/android/platform/superproject/main/+/main:frameworks/base/services/core/java/com/android/server/adb/AdbDebuggingManager.java;l=1419;drc=61197364367c9e404c7da6900658f1b16c42d0da
function getFingerprint(key: AdbPrivateKey) {
    const publicKey = adbGeneratePublicKey(key);
    const md5 = md5Digest(publicKey);
    return Array.from(md5, (byte) => byte.toString(16).padStart(2, "0")).join(
        ":",
    );
}

export interface AdbKeyInfo {
    fingerprint: string;
    name: string | undefined;
}

export const AdbAuthType = {
    Token: 1,
    Signature: 2,
    PublicKey: 3,
} as const;

export type AdbAuthType = (typeof AdbAuthType)[keyof typeof AdbAuthType];

export interface AdbDaemonAuthenticationProcessor {
    process(packet: AdbPacketData): Promise<AdbPacketData>;

    close?(): MaybePromiseLike<undefined>;
}

export interface AdbDaemonDefaultAuthenticationProcessorInit {
    credentialManager: AdbCredentialManager;
    onKeyLoadError?: ((error: Error) => void) | undefined;
    onSignatureAuthentication?: ((key: AdbKeyInfo) => void) | undefined;
    onSignatureRejected?: ((key: AdbKeyInfo) => void) | undefined;
    onPublicKeyAuthentication?: ((key: AdbKeyInfo) => void) | undefined;
}

export class AdbDaemonDefaultAuthenticationProcessor
    implements AdbDaemonAuthenticationProcessor
{
    #credentialStore: AdbCredentialManager;
    #onKeyLoadError: ((error: Error) => void) | undefined;
    #onSignatureAuthentication: ((key: AdbKeyInfo) => void) | undefined;
    #onSignatureRejected: ((key: AdbKeyInfo) => void) | undefined;
    #onPublicKeyAuthentication: ((key: AdbKeyInfo) => void) | undefined;

    #iterator:
        | Iterator<MaybeError<AdbPrivateKey>, void, void>
        | AsyncIterator<MaybeError<AdbPrivateKey>, void, void>
        | undefined;

    #prevKeyInfo: AdbKeyInfo | undefined;
    #firstKey: AdbPrivateKey | undefined;

    constructor(init: AdbDaemonDefaultAuthenticationProcessorInit) {
        this.#credentialStore = init.credentialManager;
        this.#onKeyLoadError = init.onKeyLoadError;
        this.#onSignatureAuthentication = init.onSignatureAuthentication;
        this.#onSignatureRejected = init.onSignatureRejected;
        this.#onPublicKeyAuthentication = init.onPublicKeyAuthentication;
    }

    async #iterate(token: Uint8Array): Promise<AdbPacketData | undefined> {
        if (!this.#iterator) {
            const iterable = this.#credentialStore.iterateKeys();
            if (Symbol.iterator in iterable) {
                this.#iterator = iterable[Symbol.iterator]();
            } else if (Symbol.asyncIterator in iterable) {
                this.#iterator = iterable[Symbol.asyncIterator]();
            } else {
                throw new Error("`iterateKeys` doesn't return an iterator");
            }
        }

        const { done, value: result } = await this.#iterator.next();
        if (done) {
            return undefined;
        }

        if (result instanceof Error) {
            this.#onKeyLoadError?.(result);
            return await this.#iterate(token);
        }

        if (!this.#firstKey) {
            this.#firstKey = result;
        }

        // A new token implies the previous signature was rejected.
        if (this.#prevKeyInfo) {
            this.#onSignatureRejected?.(this.#prevKeyInfo);
        }

        const fingerprint = getFingerprint(result);
        this.#prevKeyInfo = { fingerprint, name: result.name };
        this.#onSignatureAuthentication?.(this.#prevKeyInfo);

        return {
            command: AdbCommand.Auth,
            arg0: AdbAuthType.Signature,
            arg1: 0,
            payload: rsaSign(result, token),
        };
    }

    async process(packet: AdbPacketData): Promise<AdbPacketData> {
        if (packet.arg0 !== AdbAuthType.Token) {
            throw new Error("Unsupported authentication packet");
        }

        const signature = await this.#iterate(packet.payload);
        if (signature) {
            return signature;
        }

        let key = this.#firstKey;
        if (!key) {
            key = await this.#credentialStore.generateKey();
        }

        const publicKeyLength = adbGetPublicKeySize();
        const [publicKeyBase64Length] =
            calculateBase64EncodedLength(publicKeyLength);

        const nameBuffer = key.name?.length
            ? encodeUtf8(key.name)
            : EmptyUint8Array;
        const publicKeyBuffer = new Uint8Array(
            publicKeyBase64Length +
                (nameBuffer.length ? nameBuffer.length + 1 : 0) + // Space character + name
                1, // Null character
        );

        adbGeneratePublicKey(key, publicKeyBuffer);
        encodeBase64(
            publicKeyBuffer.subarray(0, publicKeyLength),
            publicKeyBuffer,
        );

        if (nameBuffer.length) {
            publicKeyBuffer[publicKeyBase64Length] = 0x20;
            publicKeyBuffer.set(nameBuffer, publicKeyBase64Length + 1);
        }

        this.#onPublicKeyAuthentication?.({
            fingerprint: getFingerprint(key),
            name: key.name,
        });

        return {
            command: AdbCommand.Auth,
            arg0: AdbAuthType.PublicKey,
            arg1: 0,
            payload: publicKeyBuffer,
        };
    }

    async close(): Promise<undefined> {
        await this.#iterator?.return?.();

        this.#iterator = undefined;
        this.#firstKey = undefined;
    }
}

export type AdbDaemonAuthenticateOptions = Pick<
    AdbDaemonTransportInit,
    | "serial"
    | "connection"
    | "features"
    | "initialDelayedAckBytes"
    | "preserveConnection"
    | "readTimeLimit"
>;

export interface AdbDaemonAuthenticator {
    authenticate(
        options: AdbDaemonAuthenticateOptions,
    ): Promise<AdbDaemonTransport>;
}

export class AdbDaemonDefaultAuthenticator implements AdbDaemonAuthenticator {
    static authenticate(
        processor: AdbDaemonDefaultAuthenticationProcessor,
        options: AdbDaemonAuthenticateOptions,
    ): Promise<AdbDaemonTransport> {
        const authenticator = new AdbDaemonDefaultAuthenticator(
            () => processor,
        );
        return authenticator.authenticate(options);
    }

    #createProcessor: () => AdbDaemonAuthenticationProcessor;

    constructor(createProcessor: () => AdbDaemonAuthenticationProcessor) {
        this.#createProcessor = createProcessor;
    }

    #sendPacket(
        writer: WritableStreamDefaultWriter<Consumable<AdbPacketInit>>,
        init: AdbPacketData,
    ): Promise<void>;
    #sendPacket(
        writer: WritableStreamDefaultWriter<Consumable<AdbPacketInit>>,
        init: AdbPacketInit,
    ) {
        // Always send checksum in auth steps
        // Because we don't know if the device needs it or not.
        init.checksum = calculateChecksum(init.payload);
        init.magic = init.command ^ 0xffffffff;
        return Consumable.WritableStream.write(writer, init);
    }

    async authenticate({
        serial,
        connection,
        features = AdbDeviceFeatures,
        initialDelayedAckBytes = ADB_DAEMON_DEFAULT_INITIAL_PAYLOAD_SIZE,
        preserveConnection,
        readTimeLimit,
    }: AdbDaemonAuthenticateOptions): Promise<AdbDaemonTransport> {
        const processor = this.#createProcessor();

        // Initially, set to highest-supported version and payload size.
        let version = 0x01000001;
        // Android 4: 4K, Android 7: 256K, Android 9: 1M
        let maxPayloadSize = 1024 * 1024;

        const resolver = new PromiseResolver<string>();

        // Here is similar to `AdbPacketDispatcher`,
        // But the received packet types and send packet processing are different.
        const abortController = new AbortController();

        const writer = connection.writable.getWriter();

        const pipe = connection.readable
            .pipeTo(
                new WritableStream({
                    write: async (packet) => {
                        switch (packet.command) {
                            case AdbCommand.Connect:
                                version = Math.min(version, packet.arg0);
                                maxPayloadSize = Math.min(
                                    maxPayloadSize,
                                    packet.arg1,
                                );
                                resolver.resolve(decodeUtf8(packet.payload));
                                break;
                            case AdbCommand.Auth: {
                                await this.#sendPacket(
                                    writer,
                                    await processor.process(packet),
                                );
                                break;
                            }
                            default:
                                // Maybe the previous ADB client exited without reading all packets,
                                // so they are still waiting in OS internal buffer.
                                // Just ignore them.
                                // Because a `Connect` packet will reset the device,
                                // Eventually there will be `Connect` and `Auth` response packets.
                                break;
                        }
                    },
                }),
                {
                    // Don't cancel the source ReadableStream on AbortSignal abort.
                    preventCancel: true,
                    signal: abortController.signal,
                },
            )
            .then(
                async () => {
                    await processor.close?.();

                    // If `resolver` is already settled, call `reject` won't do anything.
                    resolver.reject(
                        new Error("Connection closed unexpectedly"),
                    );
                },
                async (e) => {
                    await processor.close?.();

                    resolver.reject(e);
                },
            );

        if (initialDelayedAckBytes <= 0) {
            const index = features.indexOf(AdbFeature.DelayedAck);
            if (index !== -1) {
                features = features.toSpliced(index, 1);
            }
        }

        let banner: string;
        try {
            await this.#sendPacket(writer, {
                command: AdbCommand.Connect,
                arg0: version,
                arg1: maxPayloadSize,
                // The terminating `;` is required in formal definition
                // But ADB daemon (all versions) can still work without it
                payload: encodeUtf8(`host::features=${features.join(",")}`),
            });

            banner = await resolver.promise;
        } finally {
            // When failed, release locks on `connection` so the caller can try again.
            // When success, also release locks so `AdbPacketDispatcher` can use them.
            abortController.abort();
            writer.releaseLock();

            // Wait until pipe stops (`ReadableStream` lock released)
            await pipe;
        }

        return new AdbDaemonTransport({
            serial,
            connection,
            version,
            maxPayloadSize,
            banner,
            features,
            initialDelayedAckBytes,
            preserveConnection: preserveConnection,
            readTimeLimit: readTimeLimit,
        });
    }
}
