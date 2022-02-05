import { IconButton, IListProps, List, mergeStyles, mergeStyleSets, Stack } from '@fluentui/react';
import { AdbPacketInit, decodeUtf8 } from '@yume-chan/adb';
import { DisposableList } from '@yume-chan/event';
import { observer } from "mobx-react-lite";
import { PropsWithChildren, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { globalState, logger } from "../state";
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

function serializePacket(packet: AdbPacketInit) {
    const command = decodeUtf8(new Uint32Array([packet.command]).buffer);

    const parts = [
        command,
        packet.arg0.toString(16).padStart(8, '0'),
        packet.arg1.toString(16).padStart(8, '0'),
    ];

    if (packet.payload) {
        parts.push(
            Array.from(
                new Uint8Array(packet.payload),
                byte => byte.toString(16).padStart(2, '0')
            ).join(' ')
        );
    }

    return parts.join(' ');
}

const LogLine = withDisplayName('LoggerLine')(({ packet }: { packet: [string, AdbPacketInit]; }) => {
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

function shouldVirtualize(props: IListProps<[string, AdbPacketInit]>) {
    return !!props.items && props.items.length > 100;
}

function renderCell(item?: [string, AdbPacketInit]) {
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
    const [packets, setPackets] = useState<[string, AdbPacketInit][]>([]);
    const scrollerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const disposables = new DisposableList();
        disposables.add(logger.onIncomingPacket((packet => {
            setPackets(packets => {
                packets = packets.slice();
                packets.push(['Incoming', packet]);
                return packets;
            });
        })));
        disposables.add(logger.onOutgoingPacket(packet => {
            setPackets(packets => {
                packets = packets.slice();
                packets.push(['Outgoing', packet]);
                return packets;
            });
        }));
        return disposables.dispose;
    }, []);

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
                setPackets(lines => {
                    window.navigator.clipboard.writeText(lines.join('\r'));
                    return lines;
                });
            },
        },
        {
            key: 'Clear',
            text: 'Clear',
            iconProps: { iconName: Icons.Delete },
            onClick: () => {
                setPackets([]);
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
                    items={packets}
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
