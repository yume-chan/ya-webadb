import React from 'react';
import { memo, NamedExoticComponent } from 'react';

export function withDisplayName<P extends object>(
    name: string,
    Component: React.FunctionComponent<P>
): NamedExoticComponent<P> {
    Component.displayName = name;
    return memo(Component);
}

export function forwardRef<P extends object>(
    name: string,
    Component: React.ForwardRefRenderFunction<unknown, P>
) {
    Component.displayName = name;
    return memo(React.forwardRef(Component));
}
