import { AnimationClassNames, concatStyleSets, IStackProps, Stack } from '@fluentui/react';
import React, { useMemo, useRef } from 'react';
import { match, matchPath, RedirectProps, RouteProps, useLocation, useRouteMatch } from 'react-router-dom';
import withDisplayName from './with-display-name';

export const DefaultStackProps: IStackProps = {
    tokens: { childrenGap: 8, padding: 8 },
    verticalFill: true,
};

export const RouteStackProps: IStackProps = {
    ...DefaultStackProps,
    className: AnimationClassNames.slideUpIn10,
    styles: { root: { overflow: 'auto' } },
};

export const CacheRoute = withDisplayName('CacheRoute', (props: RouteProps) => {
    const match = useRouteMatch(props);

    const everMatched = useRef(!!match);
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

    if (!everMatched.current) {
        return null;
    }

    return (
        <Stack {...stackProps} >
            {props.children}
        </Stack>
    );
});

export interface CacheSwitchProps {
    children: React.ReactElement[];
}

export const CacheSwitch = withDisplayName('CacheSwitch', (props: CacheSwitchProps) => {
    const location = useLocation();
    let contextMatch = useRouteMatch();

    let element: React.ReactElement | undefined;
    let computedMatch: match | null | undefined;
    let cached: React.ReactElement[] = [];
    React.Children.forEach(props.children, child => {
        if (React.isValidElement<RouteProps & RedirectProps>(child)) {
            const path = child.props.path ?? child.props.from;
            const match = path
                ? matchPath(location.pathname, { ...child.props, path })
                : contextMatch;

            if (child.type === CacheRoute) {
                cached.push(child);
                return;
            }

            if (match) {
                element = child;
                computedMatch = match;
            }

        }
    });

    return (
        <>
            {cached}
            {element ? React.cloneElement(element, { location, computedMatch }) : null}
        </>
    );
});
