import type { Init } from "./init.js";

export function setListEncoders(options: Pick<Init, "encoderName">): void {
    // Set to an invalid value
    // Server will print valid values before crashing
    // (server will crash after opening video and control sockets)
    options.encoderName = "_";
}
