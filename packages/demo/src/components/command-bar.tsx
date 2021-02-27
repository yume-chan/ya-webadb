import { CommandBar as FluentCommandBar, ICommandBarProps, StackItem } from '@fluentui/react';
import { withDisplayName } from '../utils/with-display-name';

const ContainerStyles = {
    root: {
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
