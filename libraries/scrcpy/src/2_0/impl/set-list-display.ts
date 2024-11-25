import type { Init } from "./init.js";

export function setListDisplays(options: Pick<Init, "listDisplays">): void {
    options.listDisplays = true;
}
