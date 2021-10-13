export function asyncEffect<Args extends unknown[]>(effect: (signal: AbortSignal, ...args: Args) => Promise<void | (() => void)>) {
    let cancelLast = () => { };

    return async (...args: Args) => {
        cancelLast();
        cancelLast = () => {
            // Effect finished before abortion
            // Call cleanup
            if (typeof cleanup === 'function') {
                cleanup();
            }

            // Request abortion
            abortController.abort();
        };

        const abortController = new AbortController();
        let cleanup: void | (() => void);

        try {
            cleanup = await effect(abortController.signal, ...args);

            // Abortion requested but the effect still finished
            // Immediately call cleanup
            if (abortController.signal.aborted) {
                if (typeof cleanup === 'function') {
                    cleanup();
                }
            }
        } catch (e) {
            if (e instanceof DOMException) {
                // Ignore errors from AbortSignal-aware APIs
                // (e.g. `fetch`)
                if (e.name === 'AbortError') {
                    return;
                }
            }

            console.error(e);
        }
    };
}
