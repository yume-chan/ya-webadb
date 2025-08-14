import { decodeBase64, decodeUtf8, encodeBase64 } from "@yume-chan/adb";

import type { TangoDataStorage } from "./type.js";

export class TangoLocalStorage implements TangoDataStorage {
    readonly #storageKey: string;

    constructor(storageKey: string) {
        this.#storageKey = storageKey;
    }

    save(data: Uint8Array): undefined {
        localStorage.setItem(this.#storageKey, decodeUtf8(encodeBase64(data)));
    }

    *load(): Generator<Uint8Array, void, void> {
        const data = localStorage.getItem(this.#storageKey);
        if (data) {
            yield decodeBase64(data);
        }
    }
}
