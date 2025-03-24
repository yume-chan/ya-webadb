import type { ProcessSpawner } from "@yume-chan/adb";

import { AdbScrcpyOptions3_1 } from "./3_1.js";

export class AdbScrcpyOptionsLatest<
    TVideo extends boolean,
> extends AdbScrcpyOptions3_1<TVideo> {
    constructor(
        init: AdbScrcpyOptions3_1.Init<TVideo>,
        metadata: { version: string; spawner?: ProcessSpawner | undefined },
    ) {
        super(init, metadata);
    }
}

export namespace AdbScrcpyOptionsLatest {
    export type Init<TVideo extends boolean = boolean> =
        AdbScrcpyOptions3_1.Init<TVideo>;
}
