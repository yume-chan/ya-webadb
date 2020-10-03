import React, { memo } from 'react';

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
