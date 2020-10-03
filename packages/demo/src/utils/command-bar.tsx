import { CommandBar as FluentCommandBar, ICommandBarProps, StackItem } from '@fluentui/react';
import React from 'react';
import { withDisplayName } from './with-display-name';

const ContainerStyles = {
    root: {
        margin: '-20px -20px 0 -20px',
        borderBottom: '1px solid rgb(243, 242, 241)',
    }
} as const;

export const CommandBar = withDisplayName('CommandBar')((props: ICommandBarProps) => {
    return (
        <StackItem styles={ContainerStyles}>
            <FluentCommandBar {...props} />
        </StackItem>
    );
});
