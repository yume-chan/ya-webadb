import { AdbScrcpyOptions3_1 } from "./3_1.js";

export class AdbScrcpyOptionsLatest extends AdbScrcpyOptions3_1 {
    constructor(init: AdbScrcpyOptions3_1.Init, version: string) {
        super(init, version);
    }
}

export namespace AdbScrcpyOptionsLatest {
    export type Init = AdbScrcpyOptions3_1.Init;
}
