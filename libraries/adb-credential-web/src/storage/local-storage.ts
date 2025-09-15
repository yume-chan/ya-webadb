import { decodeBase64, decodeUtf8, encodeBase64 } from "@yume-chan/adb";

import type { TangoKey, TangoKeyStorage } from "./type.js";

type TangoKeyJson = {
    [K in keyof TangoKey]: TangoKey[K] extends Uint8Array
        ? string
        : TangoKey[K];
};

export class TangoLocalStorage implements TangoKeyStorage {
    readonly #storageKey: string;

    constructor(storageKey: string) {
        this.#storageKey = storageKey;
    }

    save(privateKey: Uint8Array, name: string | undefined): undefined {
        const json = JSON.stringify({
            privateKey: decodeUtf8(encodeBase64(privateKey)),
            name,
        } satisfies TangoKeyJson);

        localStorage.setItem(this.#storageKey, json);
    }

    *load(): Generator<TangoKey, void, void> {
        const json = localStorage.getItem(this.#storageKey);
        if (json) {
            const { privateKey, name } = JSON.parse(json) as TangoKeyJson;
            yield {
                privateKey: decodeBase64(privateKey),
                name,
            };
        }
    }
}
