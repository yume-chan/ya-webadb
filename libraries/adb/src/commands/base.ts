import { AutoDisposable } from "@yume-chan/event";

import type { Adb } from "../adb.js";

export class AdbServiceBase extends AutoDisposable {
    readonly #adb: Adb;
    get adb() {
        return this.#adb;
    }

    constructor(adb: Adb) {
        super();
        this.#adb = adb;
    }
}
