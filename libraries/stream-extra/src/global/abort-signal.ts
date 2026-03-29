import type {
    AddEventListenerOptions,
    Event,
    EventListenerOptions,
    EventListenerOrEventListenerObject,
} from "./event.js";
import type { GlobalPrototypeOr, GlobalValueOr } from "./utils.js";
import { getGlobalValue } from "./utils.js";

interface AbortSignalEventMap {
    abort: Event;
}

/**
 * The **`AbortSignal`** interface represents a signal object that allows you to communicate with an asynchronous operation (such as a fetch request) and abort it if required via an AbortController object.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/AbortSignal)
 */
interface _AbortSignal {
    /**
     * The **`aborted`** read-only property returns a value that indicates whether the asynchronous operations the signal is communicating with are aborted (true) or not (false).
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/AbortSignal/aborted)
     */
    readonly aborted: boolean;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/AbortSignal/abort_event) */
    onabort: ((this: AbortSignal, ev: Event) => void) | null;
    /**
     * The **`reason`** read-only property returns a JavaScript value that indicates the abort reason.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/AbortSignal/reason)
     */
    readonly reason: unknown;
    /**
     * The **`throwIfAborted()`** method throws the signal's abort reason if the signal has been aborted; otherwise it does nothing.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/AbortSignal/throwIfAborted)
     */
    throwIfAborted(): void;
    addEventListener<K extends keyof AbortSignalEventMap>(
        type: K,
        listener: (this: AbortSignal, ev: AbortSignalEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener<K extends keyof AbortSignalEventMap>(
        type: K,
        listener: (this: AbortSignal, ev: AbortSignalEventMap[K]) => void,
        options?: boolean | EventListenerOptions,
    ): void;
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void;
}

export type AbortSignal = GlobalPrototypeOr<"AbortSignal", _AbortSignal>;

interface _AbortSignalConstructor {
    /**
     * The **`AbortSignal.abort()`** static method returns an AbortSignal that is already set as aborted (and which does not trigger an abort event).
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/AbortSignal/abort_static)
     */
    abort(reason?: unknown): AbortSignal;
    /**
     * The **`AbortSignal.any()`** static method takes an iterable of abort signals and returns an AbortSignal. The returned abort signal is aborted when any of the input iterable abort signals are aborted. The abort reason will be set to the reason of the first signal that is aborted. If any of the given abort signals are already aborted then so will be the returned AbortSignal.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/AbortSignal/any_static)
     */
    any(signals: Iterable<AbortSignal>): AbortSignal;
    /**
     * The **`AbortSignal.timeout()`** static method returns an AbortSignal that will automatically abort after a specified time.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/AbortSignal/timeout_static)
     */
    timeout(milliseconds: number): AbortSignal;
}

type AbortSignalConstructor = GlobalValueOr<
    "AbortSignal",
    _AbortSignalConstructor
>;

export const AbortSignal =
    getGlobalValue<AbortSignalConstructor>("AbortSignal");

/**
 * The **`AbortController`** interface represents a controller object that allows you to abort one or more Web requests as and when desired.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/AbortController)
 */
interface _AbortController {
    /**
     * The **`signal`** read-only property of the AbortController interface returns an AbortSignal object instance, which can be used to communicate with/abort an asynchronous operation as desired.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/AbortController/signal)
     */
    readonly signal: AbortSignal;
    /**
     * The **`abort()`** method of the AbortController interface aborts an asynchronous operation before it has completed. This is able to abort fetch requests, the consumption of any response bodies, or streams.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/AbortController/abort)
     */
    abort(reason?: unknown): void;
}

export type AbortController = GlobalPrototypeOr<
    "AbortController",
    _AbortController
>;

interface _AbortControllerConstructor {
    prototype: AbortController;
    new (): AbortController;
}

type AbortControllerConstructor = GlobalValueOr<
    "AbortController",
    _AbortControllerConstructor
>;

export const AbortController =
    getGlobalValue<AbortControllerConstructor>("AbortController");
