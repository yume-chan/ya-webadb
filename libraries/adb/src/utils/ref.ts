import type { Disposable } from "@yume-chan/event";

interface GlobalExtension {
    setInterval: (callback: () => void, delay: number) => number;
    clearInterval: (id: number) => void;
}

const { setInterval, clearInterval } = globalThis as unknown as GlobalExtension;

/**
 * An object to keep current Node.js process alive even when no code is running.
 *
 * Does nothing in Web environments.
 */
export class Ref implements Disposable {
    #intervalId: number | undefined;

    #count = 0;

    constructor(options?: { unref?: boolean | undefined }) {
        if (!options?.unref) {
            this.ref();
        }
    }

    ref() {
        if (this.#count === 0) {
            // `setInterval` can keep current Node.js alive, the delay value doesn't matter
            this.#intervalId = setInterval(() => {}, 60 * 1000);
        }
        this.#count += 1;
    }

    unref() {
        this.#count -= 1;
        if (this.#count === 0) {
            this.dispose();
        }
    }

    dispose(): void {
        if (this.#intervalId) {
            clearInterval(this.#intervalId);
            this.#intervalId = undefined;
        }
    }
}
