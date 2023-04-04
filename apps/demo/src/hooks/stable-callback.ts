import { MutableRefObject, useRef } from "react";

import { useLayoutEffect } from "./layout-effect";

const UNINITIALIZED = Symbol("UNINITIALIZED");

export function useConstLazy<T>(initializer: () => T): T {
    const ref = useRef<T | typeof UNINITIALIZED>(UNINITIALIZED);
    if (ref.current === UNINITIALIZED) {
        ref.current = initializer();
    }
    return ref.current;
}

export function useConst<T>(value: T): T {
    const ref = useRef(value);
    return ref.current;
}

export function useLatestRef<T>(value: T): MutableRefObject<T> {
    const ref = useRef(value);
    useLayoutEffect(() => {
        ref.current = value;
    }, [value]);
    return ref;
}

export function useStableCallback<T extends (...args: any[]) => void>(
    callback: T
): T {
    const callbackRef = useLatestRef(callback);
    return useConst(function (...args) {
        return callbackRef.current(...args);
    } as T);
}
