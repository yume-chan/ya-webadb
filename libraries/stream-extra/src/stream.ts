import { type AbortSignal } from "web-streams-polyfill";
export * from "web-streams-polyfill";

/** A controller object that allows you to abort one or more DOM requests as and when desired. */
export interface AbortController {
    /**
     * Returns the AbortSignal object associated with this object.
     */
    readonly signal: AbortSignal;

    /**
     * Invoking this method will set this object's AbortSignal's aborted flag and signal to any observers that the associated activity is to be aborted.
     */
    abort(reason?: any): void;
}

interface AbortControllerConstructor {
    prototype: AbortController;
    new (): AbortController;
}

interface GlobalExtension {
    AbortController: AbortControllerConstructor;
}

export const AbortController: AbortControllerConstructor = (
    globalThis as unknown as GlobalExtension
).AbortController;
