import React, { memo, useCallback, useEffect, useRef } from 'react';

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

export function useStableCallback<TArgs extends any[], R>(callback: (...args: TArgs) => R): (...args: TArgs) => R {
    const ref = useRef<(...args: TArgs) => R>(callback);

    useEffect(() => {
        ref.current = callback;
    });

    const wrapper = useRef((...args: TArgs) => {
        return ref.current.apply(undefined, args);
    });

    return wrapper.current;
}
