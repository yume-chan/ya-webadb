import { memo, NamedExoticComponent } from 'react';

export default function withDisplayName<P extends object>(
    name: string,
    Component: React.FunctionComponent<P>
): NamedExoticComponent<P> {
    Component.displayName = name;
    return memo(Component);
}
