import { WritableStream } from "./global/index.js";

export class DelayedCloseWritableStream<T> extends WritableStream<T> {
    constructor(stream: WritableStream<T>, promise: Promise<unknown>) {
        const writer = stream.getWriter();

        // Suppress unhandled promise warning when
        // the stream is never closed (promise never awaited)
        void promise.catch(() => {});

        super({
            write(chunk) {
                return writer.write(chunk);
            },
            async close() {
                await writer.close();
                await promise;
            },
            async abort(reason) {
                await writer.abort(reason);
                await promise.catch(() => {});
            },
        });
    }
}
