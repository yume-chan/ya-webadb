// cspell: ignore ponyfill

import type { AbortSignal } from "web-streams-polyfill";
// TODO: Upgrade to `web-streams-polyfill@4.0.0-beta.2` once released.
// `web-streams-polyfill@4.0.0-beta.1` changed the default export to ponyfill,
// But it forgot to include `type` export so it's unusable.
// See https://github.com/MattiasBuelens/web-streams-polyfill/pull/107
export * from 'web-streams-polyfill';

/** A controller object that allows you to abort one or more DOM requests as and when desired. */
export interface AbortController {
    /**
     * Returns the AbortSignal object associated with this object.
     */

    readonly signal: AbortSignal;
    /**
     * Invoking this method will set this object's AbortSignal's aborted flag and signal to any observers that the associated activity is to be aborted.
     */
    abort(): void;
}

export let AbortController: {
    prototype: AbortController;
    new(): AbortController;
};

({ AbortController } = globalThis as any);
