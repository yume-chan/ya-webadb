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

export class TangoNodeStorage implements TangoKeyStorage {
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
            throw new Error("Invalid private key file: " + path, { cause: e });
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
        const stats = await stat(path);

        if (stats.isFile()) {
            try {
                yield await this.#readKey(path);
            } catch (e) {
                if (e instanceof Error) {
                    yield e;
                } else {
                    yield new Error(String(e));
                }
            }
            return;
        }

        if (stats.isDirectory()) {
            for await (const dirent of await opendir(path)) {
                if (!dirent.isFile()) {
                    continue;
                }

                if (!dirent.name.endsWith(".adb_key")) {
                    continue;
                }

                try {
                    yield await this.#readKey(resolve(path, dirent.name));
                } catch (e) {
                    if (e instanceof Error) {
                        yield e;
                    } else {
                        yield new Error(String(e));
                    }
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
                if (e instanceof Error) {
                    yield e;
                } else {
                    yield new Error(String(e));
                }
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
