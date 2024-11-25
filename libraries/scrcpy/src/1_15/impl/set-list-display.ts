import type { Init } from "./init.js";

export function setListDisplays(options: Pick<Init, "displayId">): void {
    // Set to an invalid value
    // Server will print valid values before crashing
    // (server will crash before opening sockets)
    options.displayId = -1;
}
