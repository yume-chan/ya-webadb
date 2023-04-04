import { useEffect } from "react";

type CommonEventMaps<T> = T extends typeof globalThis
    ? WindowEventMap
    : T extends Window
    ? WindowEventMap
    : T extends Document
    ? DocumentEventMap
    : T extends HTMLElement
    ? HTMLElementEventMap
    : T extends SVGElement
    ? SVGElementEventMap
    : { [type: string]: unknown };

const useClientAddEventListener = <
    T extends EventTarget,
    U extends keyof CommonEventMaps<T>
>(
    target: T | (() => T),
    type: U,
    listener: (this: T, ev: CommonEventMaps<T>[U]) => any,
    options?: AddEventListenerOptions,
    deps?: readonly unknown[]
) => {
    useEffect(() => {
        const targetValue = typeof target === "function" ? target() : target;
        targetValue.addEventListener(type as any, listener as any, options);

        return () =>
            targetValue.removeEventListener(
                type as any,
                listener as any,
                options
            );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
};

export const useAddEventListener =
    typeof window !== "undefined" ? useClientAddEventListener : () => {};
