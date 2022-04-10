import { AnimationClassNames, IStackProps } from "@fluentui/react";

export const CommonStackTokens = { childrenGap: 8 };

export const DefaultStackProps: IStackProps = {
    tokens: { childrenGap: 8, padding: 16 },
    verticalFill: true,
};

export const RouteStackProps: IStackProps = {
    ...DefaultStackProps,
    className: AnimationClassNames.slideUpIn10!,
    styles: { root: { overflow: 'auto', position: 'relative' } },
    disableShrink: true,
};
