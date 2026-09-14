import { WritableStream } from "./global/index.js";

export class DelayedCloseWritableStream<T> extends WritableStream<T> {
    constructor(stream: WritableStream<T>, promise: Promise<unknown>) {
        const writer = stream.getWriter();

        // Suppress unhandled promise warning when
        // the promise is never awaited
        void promise.catch(() => {});

        super({
            async write(chunk) {
                try {
                    await writer.write(chunk);
                } catch (e) {
                    try {
                        await promise;
                    } catch (e2) {
                        throw e2 !== e && typeof SuppressedError !== "undefined"
                            ? new SuppressedError(e, e2)
                            : e;
                    }
                    throw e;
                }
            },
            async close() {
                const [closeResult, promiseResult] = await Promise.allSettled([
                    writer.close(),
                    promise,
                ]);
                if (closeResult.status === "rejected") {
                    if (
                        promiseResult.status === "rejected" &&
                        // Ignore promise rejection if the reason is known
                        promiseResult.reason !== closeResult.reason &&
                        typeof AggregateError !== "undefined"
                    ) {
                        throw new AggregateError([
                            closeResult.reason,
                            promiseResult.reason,
                        ]);
                    }
                    throw closeResult.reason;
                }
                if (promiseResult.status === "rejected") {
                    throw promiseResult.reason;
                }
            },
            async abort(reason) {
                const [abortResult, promiseResult] = await Promise.allSettled([
                    writer.abort(reason),
                    promise,
                ]);

                // Ignore promise rejection if the reason is known
                if (
                    promiseResult.status === "rejected" &&
                    promiseResult.reason !== reason
                ) {
                    if (abortResult.status === "rejected") {
                        throw typeof AggregateError !== "undefined"
                            ? new AggregateError([
                                  abortResult.reason,
                                  promiseResult.reason,
                              ])
                            : abortResult.reason;
                    } else {
                        throw promiseResult.reason;
                    }
                }

                if (abortResult.status === "rejected") {
                    throw abortResult.reason;
                }
            },
        });
    }
}
