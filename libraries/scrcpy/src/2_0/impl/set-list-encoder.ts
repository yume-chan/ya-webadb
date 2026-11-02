import type { Init } from "./init.js";

export function setListEncoders(options: Pick<Init, "listEncoders">): void {
    options.listEncoders = true;
}
