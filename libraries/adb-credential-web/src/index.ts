// cspell: ignore RSASSA

import type { AdbCredentialStore, AdbPrivateKey } from "@yume-chan/adb";

function openDatabase() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("Tango", 1);
        request.onerror = () => {
            reject(request.error!);
        };
        request.onupgradeneeded = () => {
            const db = request.result;
            db.createObjectStore("Authentication", { autoIncrement: true });
        };
        request.onsuccess = () => {
            const db = request.result;
            resolve(db);
        };
    });
}

async function saveKey(key: Uint8Array): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction("Authentication", "readwrite");
        const store = transaction.objectStore("Authentication");
        const putRequest = store.add(key);
        putRequest.onerror = () => {
            reject(putRequest.error!);
        };
        putRequest.onsuccess = () => {
            resolve();
        };
        transaction.onerror = () => {
            reject(transaction.error!);
        };
        transaction.oncomplete = () => {
            db.close();
        };
    });
}

async function getAllKeys() {
    const db = await openDatabase();

    return new Promise<Uint8Array[]>((resolve, reject) => {
        const transaction = db.transaction("Authentication", "readonly");
        const store = transaction.objectStore("Authentication");
        const getRequest = store.getAll();
        getRequest.onerror = () => {
            reject(getRequest.error!);
        };
        getRequest.onsuccess = () => {
            resolve(getRequest.result as Uint8Array[]);
        };
        transaction.onerror = () => {
            reject(transaction.error!);
        };
        transaction.oncomplete = () => {
            db.close();
        };
    });
}

/**
 * An `AdbCredentialStore` implementation that creates RSA private keys using Web Crypto API
 * and stores them in IndexedDB.
 */
export default class AdbWebCredentialStore implements AdbCredentialStore {
    readonly #appName: string;

    constructor(appName = "Tango") {
        this.#appName = appName;
    }

    /**
     * Generates a RSA private key and store it into LocalStorage.
     *
     * Calling this method multiple times will overwrite the previous key.
     *
     * @returns The private key in PKCS #8 format.
     */
    async generateKey(): Promise<AdbPrivateKey> {
        const { privateKey: cryptoKey } = await crypto.subtle.generateKey(
            {
                name: "RSASSA-PKCS1-v1_5",
                modulusLength: 2048,
                // 65537
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: "SHA-1",
            },
            true,
            ["sign", "verify"],
        );

        const privateKey = new Uint8Array(
            await crypto.subtle.exportKey("pkcs8", cryptoKey),
        );
        await saveKey(privateKey);

        return {
            buffer: privateKey,
            name: `${this.#appName}@${globalThis.location.hostname}`,
        };
    }

    /**
     * Yields the stored RSA private key.
     *
     * This method returns a generator, so `for await...of...` loop should be used to read the key.
     */
    async *iterateKeys(): AsyncGenerator<AdbPrivateKey, void, void> {
        for (const key of await getAllKeys()) {
            yield {
                buffer: key,
                name: `${this.#appName}@${globalThis.location.hostname}`,
            };
        }
    }
}
