import {
    ReadableStream,
    type BufferedReadableStream,
    type WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import Struct from "@yume-chan/struct";

import { AdbSyncRequestId, adbSyncWriteRequest } from "./request.js";
import { AdbSyncResponseId, adbSyncReadResponses } from "./response.js";

export const AdbSyncDataResponse = new Struct({ littleEndian: true })
    .uint32("dataLength")
    .uint8Array("data", { lengthField: "dataLength" })
    .extra({ id: AdbSyncResponseId.Data as const });

export type AdbSyncDataResponse =
    typeof AdbSyncDataResponse["TDeserializeResult"];

export function adbSyncPull(
    stream: BufferedReadableStream,
    writer: WritableStreamDefaultWriter<Uint8Array>,
    path: string
): ReadableStream<Uint8Array> {
    let generator!: AsyncGenerator<AdbSyncDataResponse, void, void>;
    return new ReadableStream<Uint8Array>(
        {
            async start() {
                // TODO: If `ReadableStream.from(AsyncGenerator)` is added to spec, use it instead.
                await adbSyncWriteRequest(
                    writer,
                    AdbSyncRequestId.Receive,
                    path
                );
                generator = adbSyncReadResponses(
                    stream,
                    AdbSyncResponseId.Data,
                    AdbSyncDataResponse
                );
            },
            async pull(controller) {
                const { done, value } = await generator.next();
                if (done) {
                    controller.close();
                    return;
                }
                controller.enqueue(value.data);
            },
            cancel() {
                generator.return().catch((e) => {
                    void e;
                });
                throw new Error(`Sync commands can't be canceled.`);
            },
        },
        {
            highWaterMark: 16 * 1024,
            size(chunk) {
                return chunk.byteLength;
            },
        }
    );
}
