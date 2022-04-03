import { IconButton, IListProps, List, mergeStyles, mergeStyleSets, Stack } from '@fluentui/react';
import { AdbCommand, AdbPacketCore, decodeUtf8 } from '@yume-chan/adb';
import { observer } from "mobx-react-lite";
import { PropsWithChildren, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { globalState } from "../state";
import { Icons, withDisplayName } from '../utils';
import { CommandBar } from './command-bar';

const classNames = mergeStyleSets({
    'logger-container': {
        width: 300,
    },
    grow: {
        flexGrow: 1,
        height: 0,
        padding: '0 8px',
        overflowX: 'hidden',
        overflowY: 'auto',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
    },
});

const ADB_COMMAND_NAME = {
    [AdbCommand.Auth]: 'AUTH',
    [AdbCommand.Close]: 'CLSE',
    [AdbCommand.Connect]: 'CNXN',
    [AdbCommand.OK]: 'OKAY',
    [AdbCommand.Open]: 'OPEN',
    [AdbCommand.Write]: 'WRTE',
};

function serializePacket(packet: AdbPacketCore) {
    const command =
        ADB_COMMAND_NAME[packet.command as AdbCommand] ??
        decodeUtf8(new Uint32Array([packet.command]));

    const parts = [
        command,
        packet.arg0.toString(16).padStart(8, '0'),
        packet.arg1.toString(16).padStart(8, '0'),
    ];

    if (packet.payload) {
        parts.push(
            Array.from(
                packet.payload,
                byte => byte.toString(16).padStart(2, '0')
            ).join(' ')
        );
    }

    return parts.join(' ');
}

const LogLine = withDisplayName('LoggerLine')(({ packet }: { packet: [string, AdbPacketCore]; }) => {
    const string = useMemo(() => serializePacket(packet[1]), [packet]);

    return (
        <>
            {packet[0]}{' '}{string}
        </>
    );
});

export const ToggleLogView = observer(() => {
    return (
        <IconButton
            checked={globalState.logVisible}
            iconProps={{ iconName: Icons.TextGrammarError }}
            title="Toggle Log"
            onClick={globalState.toggleLog}
        />
    );
});

export interface LoggerProps {
    className?: string;
}

function shouldVirtualize(props: IListProps<[string, AdbPacketCore]>) {
    return !!props.items && props.items.length > 100;
}

function renderCell(item?: [string, AdbPacketCore]) {
    if (!item) {
        return null;
    }

    return (
        <LogLine packet={item} />
    );
}

export const LogView = observer(({
    className,
}: LoggerProps) => {
    const scrollerRef = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
        const scroller = scrollerRef.current;
        if (scroller) {
            scroller.scrollTop = scroller.scrollHeight;
        }
    });

    const commandBarItems = useMemo(() => [
        {
            key: 'Copy',
            text: 'Copy',
            iconProps: { iconName: Icons.Copy },
            onClick: () => {
                window.navigator.clipboard.writeText(
                    globalState.logs
                        .map(
                            ([direction, packet]) => `${direction}${serializePacket((packet))}`
                        )
                        .join('\n'));
            },
        },
        {
            key: 'Clear',
            text: 'Clear',
            iconProps: { iconName: Icons.Delete },
            onClick: () => {
                globalState.clearLog();
            },
        },
    ], []);

    const mergedClassName = useMemo(() => mergeStyles(
        className,
        classNames['logger-container'],
    ), [className]);

    if (!globalState.logVisible) {
        return null;
    }

    return (
        <Stack
            className={mergedClassName}
            verticalFill
        >
            <CommandBar items={commandBarItems} />
            <div ref={scrollerRef} className={classNames.grow}>
                <List
                    items={globalState.logs}
                    onShouldVirtualize={shouldVirtualize}
                    onRenderCell={renderCell}
                />
            </div>
        </Stack>
    );
});

export function NoSsr({ children }: PropsWithChildren<{}>) {
    const [showChild, setShowChild] = useState(false);

    // Wait until after client-side hydration to show
    useEffect(() => {
        setShowChild(true);
    }, []);

    if (!showChild) {
        return null;
    }

    return <>{children}</>;
}
