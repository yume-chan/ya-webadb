interface GlobalExtension {
    setInterval: (callback: () => void, delay: number) => number;
    clearInterval: (id: number) => void;
}

const { setInterval, clearInterval } = globalThis as unknown as GlobalExtension;

/**
 * An object to keep current Node.js process alive even when no code is running.
 *
 * Does nothing in Web environments.
 *
 * Note that it does't have reference counting. Calling `unref` will
 * remove the ref no matter how many times `ref` has been previously called, and vice versa.
 * This is the same as how Node.js works.
 */
export class Ref {
    #intervalId: number | undefined;

    constructor(options?: { unref?: boolean | undefined }) {
        if (!options?.unref) {
            this.ref();
        }
    }

    ref() {
        // `setInterval` can keep current Node.js alive, the delay value doesn't matter
        this.#intervalId = setInterval(() => {}, 60 * 1000);
    }

    unref() {
        if (this.#intervalId) {
            clearInterval(this.#intervalId);
            this.#intervalId = undefined;
        }
    }
}
