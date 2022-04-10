import React, { memo, useCallback, useRef } from 'react';

export function withDisplayName(name: string) {
    return <P extends object>(Component: React.FunctionComponent<P>) => {
        Component.displayName = name;
        return memo(Component);
    };
}

export function forwardRef<T>(name: string) {
    return <P extends object>(Component: React.ForwardRefRenderFunction<T, P>) => {
        return withDisplayName(name)(React.forwardRef(Component));
    };
}

export function useCallbackRef<TArgs extends any[], R>(callback: (...args: TArgs) => R): (...args: TArgs) => R {
    const ref = useRef<(...args: TArgs) => R>(callback);
    ref.current = callback;

    const wrapper = useCallback((...args: TArgs) => {
        return ref.current.apply(undefined, args);
    }, []);

    return wrapper;
}
