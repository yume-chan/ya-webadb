import type { SimpleRsaPrivateKey } from "../crypto.js";

export interface AdbPrivateKey extends SimpleRsaPrivateKey {
    name?: string | undefined;
}
