import { AnimationClassNames, concatStyleSets, IStackProps, Stack } from '@fluentui/react';
import { Children, cloneElement, isValidElement, useMemo, useRef } from 'react';
import { match, matchPath, RedirectProps, RouteProps, useLocation, useRouteMatch } from 'react-router-dom';
import { withDisplayName } from '../utils';

export const DefaultStackProps: IStackProps = {
    tokens: { childrenGap: 8, padding: 16 },
    verticalFill: true,
};

export const RouteStackProps: IStackProps = {
    ...DefaultStackProps,
    className: AnimationClassNames.slideUpIn10!,
    styles: { root: { overflow: 'auto', position: 'relative' } },
};

export interface CacheRouteProps extends RouteProps {
    noCache?: boolean | undefined;
}

export const CacheRoute = withDisplayName('CacheRoute')((props: CacheRouteProps) => {
    const match = useRouteMatch(props);

    const everMatched = useRef(false);
    if (!everMatched.current && match) {
        everMatched.current = true;
    }

    const stackProps = useMemo((): IStackProps => ({
        ...RouteStackProps,
        styles: concatStyleSets(
            RouteStackProps.styles,
            { root: { display: match ? 'flex' : 'none' } }
        ),
    }), [!!match]);

    if (props.noCache && !match) {
        return null;
    }

    if (!everMatched.current) {
        return null;
    }

    return (
        <Stack {...stackProps} disableShrink>
            {Children.map(
                props.children,
                element =>
                    isValidElement(element)
                        ? cloneElement(element, { ...element.props, visible: !!match })
                        : element
            )}
        </Stack>
    );
});

export interface CacheSwitchProps {
    children: React.ReactNodeArray;
}

export const CacheSwitch = withDisplayName('CacheSwitch')((props: CacheSwitchProps) => {
    const location = useLocation();
    let contextMatch = useRouteMatch();

    let element: React.ReactElement | undefined;
    let computedMatch: match | null | undefined;
    let cached: React.ReactElement[] = [];
    Children.forEach(props.children, child => {
        if (isValidElement<RouteProps & RedirectProps>(child)) {
            // Always render all cached routes
            const isCacheRoute = child.type === CacheRoute;
            if (isCacheRoute) {
                cached.push(child);
            }

            // If we already found the matched route,
            // Don't care about others
            if (computedMatch) {
                return;
            }

            const path = child.props.path ?? child.props.from;
            const match = path
                ? matchPath(location.pathname, { ...child.props, path })
                : contextMatch;

            if (match) {
                computedMatch = match;

                if (isCacheRoute) {
                    // Don't render a CacheRoute twice
                    element = undefined;
                } else {
                    element = child;
                }
            }
        }
    });

    return (
        <>
            {cached}
            {element ? cloneElement(element, { location, computedMatch }) : null}
        </>
    );
});
