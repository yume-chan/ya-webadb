// cspell: ignore adbkey

import { existsSync } from "node:fs";
import {
    chmod,
    mkdir,
    opendir,
    readFile,
    stat,
    writeFile,
} from "node:fs/promises";
import { homedir, hostname, userInfo } from "node:os";
import { resolve } from "node:path";

import type { MaybeError } from "@yume-chan/adb";
import {
    adbGeneratePublicKey,
    decodeBase64,
    decodeUtf8,
    encodeBase64,
    rsaParsePrivateKey,
} from "@yume-chan/adb";
import type { TangoKey, TangoKeyStorage } from "@yume-chan/adb-credential-web";

class KeyError extends Error {
    path: string;

    constructor(message: string, path: string, options?: ErrorOptions) {
        super(message, options);
        this.path = path;
    }
}

/**
 * Can't read or parse a private key file.
 *
 * Check `path` for file path, and `cause` for the error.
 */
class InvalidKeyError extends KeyError {
    constructor(path: string, options?: ErrorOptions) {
        super(`Can't read private key file at "${path}"`, path, options);
    }
}

/**
 * Can't read or parse a vendor key.
 *
 * Check `path` for file path, and `cause` for the error.
 */
class VendorKeyError extends KeyError {
    constructor(path: string, options?: ErrorOptions) {
        super(`Can't read vendor key file at "${path}"`, path, options);
    }
}

export class TangoNodeStorage implements TangoKeyStorage {
    static readonly KeyError = KeyError;
    static readonly InvalidKeyError = InvalidKeyError;
    static readonly VendorKeyError = VendorKeyError;

    async #getAndroidDirPath() {
        const dir = resolve(homedir(), ".android");
        await mkdir(dir, { mode: 0o750, recursive: true });
        return dir;
    }

    async #getUserKeyPath() {
        return resolve(await this.#getAndroidDirPath(), "adbkey");
    }

    #getDefaultName() {
        return userInfo().username + "@" + hostname();
    }

    async save(
        privateKey: Uint8Array,
        name: string | undefined,
    ): Promise<undefined> {
        const userKeyPath = await this.#getUserKeyPath();

        // Create PEM in Strict format
        // https://datatracker.ietf.org/doc/html/rfc7468
        let pem = "-----BEGIN PRIVATE KEY-----\n";
        const base64 = decodeUtf8(encodeBase64(privateKey));
        for (let i = 0; i < base64.length; i += 64) {
            pem += base64.substring(i, i + 64) + "\n";
        }
        pem += "-----END PRIVATE KEY-----\n";
        await writeFile(userKeyPath, pem, { encoding: "utf8", mode: 0o600 });
        await chmod(userKeyPath, 0o600);

        name ??= this.#getDefaultName();
        const publicKey = adbGeneratePublicKey(rsaParsePrivateKey(privateKey));
        await writeFile(
            userKeyPath + ".pub",
            decodeUtf8(encodeBase64(publicKey)) + " " + name + "\n",
            { encoding: "utf8", mode: 0o644 },
        );
    }

    async #readPrivateKey(path: string) {
        try {
            const pem = await readFile(path, "utf8");
            return decodeBase64(
                pem
                    // Parse PEM in Lax format (allows spaces/line breaks everywhere)
                    // https://datatracker.ietf.org/doc/html/rfc7468
                    .replaceAll(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
                    .replaceAll(/\x20|\t|\r|\n|\v|\f/g, ""),
            );
        } catch (e) {
            throw new InvalidKeyError(path, { cause: e });
        }
    }

    async #readPublicKeyName(path: string): Promise<string | undefined> {
        // Google ADB actually never reads the `.pub` file for name,
        // it always returns the default name.
        // So we won't throw an error if the file can't be read.

        try {
            const publicKeyPath = path + ".pub";
            if (!(await stat(publicKeyPath)).isFile()) {
                return undefined;
            }

            const publicKey = await readFile(publicKeyPath, "utf8");
            return publicKey.split(" ")[1]?.trim();
        } catch {
            return undefined;
        }
    }

    async #readKey(path: string): Promise<TangoKey> {
        const privateKey = await this.#readPrivateKey(path);
        const name =
            (await this.#readPublicKeyName(path)) ?? this.#getDefaultName();
        return { privateKey, name };
    }

    async *#readVendorKeys(
        path: string,
    ): AsyncGenerator<MaybeError<TangoKey>, void, void> {
        let stats;
        try {
            stats = await stat(path);
        } catch (e) {
            return yield new VendorKeyError(path, { cause: e });
        }

        if (stats.isFile()) {
            try {
                return yield await this.#readKey(path);
            } catch (e) {
                return yield e instanceof KeyError
                    ? e
                    : new VendorKeyError(path, { cause: e });
            }
        }

        if (stats.isDirectory()) {
            let dir;
            try {
                dir = await opendir(path);
            } catch (e) {
                return yield new VendorKeyError(path, { cause: e });
            }

            for await (const dirent of dir) {
                if (!dirent.isFile()) {
                    continue;
                }

                if (!dirent.name.endsWith(".adb_key")) {
                    continue;
                }

                const file = resolve(path, dirent.name);
                try {
                    yield await this.#readKey(file);
                } catch (e) {
                    yield e instanceof KeyError
                        ? e
                        : new VendorKeyError(path, { cause: e });
                }
            }
        }
    }

    async *load(): AsyncGenerator<MaybeError<TangoKey>, void, void> {
        const userKeyPath = await this.#getUserKeyPath();
        if (existsSync(userKeyPath)) {
            try {
                yield await this.#readKey(userKeyPath);
            } catch (e) {
                yield e instanceof KeyError
                    ? e
                    : new InvalidKeyError(userKeyPath, { cause: e });
            }
        }

        const vendorKeys = process.env.ADB_VENDOR_KEYS;
        if (vendorKeys) {
            const separator = process.platform === "win32" ? ";" : ":";
            for (const path of vendorKeys.split(separator)) {
                yield* this.#readVendorKeys(path);
            }
        }
    }
}

export namespace TangoNodeStorage {
    export type KeyError = typeof KeyError;
    export type InvalidKeyError = typeof InvalidKeyError;
    export type VendorKeyError = typeof VendorKeyError;
}

// Re-export everything except Web-only storages
export {
    AdbWebCryptoCredentialStore,
    TangoPasswordProtectedStorage,
    TangoPrfStorage,
} from "@yume-chan/adb-credential-web";
export type {
    TangoKey,
    TangoKeyStorage,
    TangoPrfSource,
} from "@yume-chan/adb-credential-web";
