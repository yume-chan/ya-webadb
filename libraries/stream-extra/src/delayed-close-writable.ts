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
                        throw typeof SuppressedError !== "undefined"
                            ? new SuppressedError(e, e2)
                            : e;
                    }
                    throw e;
                }
            },
            async close() {
                const results = await Promise.allSettled([
                    writer.close(),
                    promise,
                ]);
                const errors = results
                    .filter((r) => r.status === "rejected")
                    .map((r) => r.reason as unknown);
                if (errors.length) {
                    throw errors.length > 1 &&
                        typeof AggregateError !== "undefined"
                        ? new AggregateError(errors)
                        : errors[0];
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
