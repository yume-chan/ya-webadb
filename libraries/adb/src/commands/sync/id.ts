import * as AdbSyncRequestId from "./id-request.js";
import * as AdbSyncResponseId from "./id-response.js";

// biome-ignore lint/suspicious/noRedeclare: TypeScript declaration merging for enum-like object
type AdbSyncRequestId =
    (typeof AdbSyncRequestId)[keyof typeof AdbSyncRequestId];

// biome-ignore lint/suspicious/noRedeclare: TypeScript declaration merging for enum-like object
type AdbSyncResponseId =
    (typeof AdbSyncResponseId)[keyof typeof AdbSyncResponseId];

export { AdbSyncRequestId, AdbSyncResponseId };
