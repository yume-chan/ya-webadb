import { IconButton, IListProps, List, mergeStyles, mergeStyleSets, Stack } from '@fluentui/react';
import { AdbLogger, AdbPacket, AdbPacketInit } from '@yume-chan/adb';
import { decodeUtf8 } from '@yume-chan/adb-backend-webusb';
import { DisposableList, EventEmitter } from '@yume-chan/event';
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { withDisplayName } from '../utils';
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

export class AdbEventLogger {
    private readonly _logger: AdbLogger;
    public get logger() { return this._logger; }

    private readonly _incomingPacketEvent = new EventEmitter<AdbPacket>();
    public get onIncomingPacket() { return this._incomingPacketEvent.event; }

    private readonly _outgoingPacketEvent = new EventEmitter<AdbPacketInit>();
    public get onOutgoingPacket() { return this._outgoingPacketEvent.event; }

    public constructor() {
        this._logger = {
            onIncomingPacket: (packet) => {
                this._incomingPacketEvent.fire(packet);
            },
            onOutgoingPacket: (packet) => {
                this._outgoingPacketEvent.fire(packet);
            },
        };
    }
}

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

export interface LoggerContextValue {
    visible: boolean;

    onVisibleChange: React.Dispatch<React.SetStateAction<boolean>>;
}

export const LoggerContext = createContext<LoggerContextValue | undefined>(undefined);

export const LoggerContextProvider = withDisplayName('LoggerContextProvider')(({ children }) => {
    const [visible, setVisible] = useState(false);
    const contextValue = useMemo(() => ({
        visible,
        onVisibleChange: setVisible,
    }), [visible, setVisible]);

    return (
        <LoggerContext.Provider value={contextValue}>
            {children}
        </LoggerContext.Provider>
    );
});

export const ToggleLogger = withDisplayName('ToggleLogger')(() => {
    const contextValue = useContext(LoggerContext);
    const handleClick = useCallback(() => {
        contextValue?.onVisibleChange(value => !value);
    }, [contextValue]);

    if (!contextValue) {
        return null;
    }

    return (
        <IconButton
            checked={contextValue.visible}
            iconProps={{ iconName: 'ChangeEntitlements' }}
            title="Toggle Log"
            onClick={handleClick}
        />
    );
});

export interface LoggerProps {
    className?: string;

    logger: AdbEventLogger;
}

function shouldVirtualize(props: IListProps<string>) {
    return !!props.items && props.items.length > 100;
}

function renderCell(item?: string) {
    return item;
}

export const Logger = withDisplayName('Logger')(({
    className,
    logger,
}: LoggerProps) => {
    const contextValue = useContext(LoggerContext);
    const [lines, setLines] = useState<string[]>([]);
    const scrollerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const disposables = new DisposableList();
        disposables.add(logger.onIncomingPacket((packet => {
            setLines(lines => {
                lines = lines.slice();
                lines.push('Incoming ' + serializePacket(packet));
                return lines;
            });
        })));
        disposables.add(logger.onOutgoingPacket(packet => {
            setLines(lines => {
                lines = lines.slice();
                lines.push('Outgoing ' + serializePacket(packet));
                return lines;
            });
        }));
        return disposables.dispose;
    }, [logger]);

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
            iconProps: {
                iconName: 'Copy',
            },
            onClick: () => {
                setLines(lines => {
                    window.navigator.clipboard.writeText(lines.join('\r'));
                    return lines;
                });
            },
        },
        {
            key: 'Clear',
            text: 'Clear',
            iconProps: {
                iconName: 'Delete',
            },
            onClick: () => {
                setLines([]);
            },
        },
    ], []);

    const mergedClassName = useMemo(() => mergeStyles(
        className,
        classNames['logger-container'],
        !contextValue?.visible && { display: 'none' }
    ), [contextValue?.visible]);

    return (
        <Stack
            className={mergedClassName}
            verticalFill
        >
            <CommandBar items={commandBarItems} />
            <div ref={scrollerRef} className={classNames.grow}>
                <List
                    items={lines}
                    usePageCache
                    onShouldVirtualize={shouldVirtualize}
                    onRenderCell={renderCell}
                />
            </div>
        </Stack>
    );
});
