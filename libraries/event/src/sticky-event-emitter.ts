import { Absence } from "./absence.js";
import type { EventListenerInfo } from "./event-emitter.js";
import { EventEmitter } from "./event-emitter.js";
import type { RemoveEventListener } from "./event.js";

/**
 * An event emitter that remembers the last emitted value and immediately emits it to new listeners.
 */
export class StickyEventEmitter<TEvent> extends EventEmitter<TEvent> {
    #value: TEvent | Absence;
    /**
     * Gets whether there is a value. If `true`, `value` can be accessed without error.
     */
    get hasValue() {
        return this.#value !== Absence;
    }
    /**
     * Gets the current value. If there is no value, throws an error.
     */
    get value() {
        if (this.#value === Absence) {
            throw new Error("No value");
        }
        return this.#value;
    }

    #equal: (a: TEvent, b: TEvent) => boolean;

    constructor(options: StickyEventEmitter.Options<TEvent> = {}) {
        super();

        if ("initialValue" in options) {
            this.#value = options.initialValue;
        } else {
            this.#value = Absence;
        }

        if (options.equals) {
            this.#equal = options.equals;
        } else {
            this.#equal = () => false;
        }
    }

    protected override addEventListener(
        info: EventListenerInfo<TEvent>,
    ): RemoveEventListener {
        if (this.#value !== Absence) {
            info.listener.call(info.thisArg, this.#value, ...info.args);
        }
        return super.addEventListener(info);
    }

    override fire(e: TEvent): void {
        if (this.#value !== Absence && this.#equal(this.#value, e)) {
            return;
        }
        this.#value = e;
        super.fire(e);
    }
}

export namespace StickyEventEmitter {
    export interface Options<TEvent> {
        initialValue?: TEvent;

        /**
         * An optional comparator function to determine whether the new value is equal to the current value.
         * If the new value is equal to the current value, the event will not be emitted.
         *
         * If not provided, all values are considered different.
         */
        equals?: (a: TEvent, b: TEvent) => boolean;
    }
}
