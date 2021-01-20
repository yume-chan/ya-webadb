import { IconButton, SearchBox, Stack, StackItem } from '@fluentui/react';
import { AdbSocket } from '@yume-chan/adb';
import { encodeUtf8 } from '@yume-chan/adb-backend-webusb';
import { AutoDisposable } from '@yume-chan/event';
import React, { CSSProperties, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';
import { ErrorDialogContext } from '../components/error-dialog';
import { ResizeObserver, withDisplayName } from '../utils';
import { RouteProps } from './type';

const ResizeObserverStyle: CSSProperties = {
    width: '100%',
    height: '100%',
};

const UpIconProps = { iconName: 'ChevronUp' };
const DownIconProps = { iconName: 'ChevronDown' };

class AdbTerminal extends AutoDisposable {
    public terminal: Terminal = new Terminal({
        scrollback: 9000,
    });

    public findAddon = new SearchAddon();

    public fitAddon = new FitAddon();

    private _parent: HTMLElement | undefined;
    public get parent() { return this._parent; }
    public set parent(value) {
        this._parent = value;

        if (value) {
            this.terminal.open(value);
            this.fitAddon.fit();
        }
    }

    private _socket: AdbSocket | undefined;
    public get socket() { return this._socket; }
    public set socket(value) {
        if (this._socket) {
            this.dispose();
        }

        this._socket = value;

        if (value) {
            this.terminal.clear();
            this.terminal.reset();

            this.addDisposable(value.onData(data => {
                this.terminal.write(new Uint8Array(data));
            }));
            this.addDisposable(this.terminal.onData(data => {
                const buffer = encodeUtf8(data);
                value.write(buffer);
            }));
        }
    }

    public constructor() {
        super();

        this.terminal.loadAddon(this.findAddon);
        this.terminal.loadAddon(this.fitAddon);
    }
}

export const Shell = withDisplayName('Shell')(({
    visible,
    device,
}: RouteProps): JSX.Element | null => {
    const { show: showErrorDialog } = useContext(ErrorDialogContext);

    const terminalRef = useRef(new AdbTerminal());

    const [findKeyword, setFindKeyword] = useState('');
    const handleFindKeywordChange = useCallback((e, newValue?: string) => {
        setFindKeyword(newValue ?? '');
        if (newValue) {
            terminalRef.current.findAddon.findNext(newValue, { incremental: true });
        }
    }, []);
    const findPrevious = useCallback(() => {
        terminalRef.current.findAddon.findPrevious(findKeyword);
    }, [findKeyword]);
    const findNext = useCallback(() => {
        terminalRef.current.findAddon.findNext(findKeyword);
    }, [findKeyword]);

    const connectingRef = useRef(false);
    useEffect(() => {
        (async () => {
            if (!device) {
                terminalRef.current.socket = undefined;
                return;
            }

            if (!visible || !!terminalRef.current.socket || connectingRef.current) {
                return;
            }

            try {
                connectingRef.current = true;
                const socket = await device.shell();
                terminalRef.current.socket = socket;
            } catch (e) {
                showErrorDialog(e.message);
            } finally {
                connectingRef.current = false;
            }
        })();
    }, [visible, device]);

    const handleContainerRef = useCallback((element: HTMLDivElement | null) => {
        terminalRef.current.parent = element ?? undefined;
    }, []);

    const handleResize = useCallback(() => {
        terminalRef.current.fitAddon.fit();
    }, []);

    return (
        <>
            <StackItem>
                <Stack horizontal>
                    <StackItem grow>
                        <SearchBox
                            placeholder="Find"
                            value={findKeyword}
                            onChange={handleFindKeywordChange}
                            onSearch={findNext}
                        />
                    </StackItem>
                    <StackItem>
                        <IconButton
                            disabled={!findKeyword}
                            iconProps={UpIconProps}
                            onClick={findPrevious}
                        />
                    </StackItem>
                    <StackItem>
                        <IconButton
                            disabled={!findKeyword}
                            iconProps={DownIconProps}
                            onClick={findNext}
                        />
                    </StackItem>
                </Stack>
            </StackItem>
            <StackItem grow styles={{ root: { minHeight: 0 } }}>
                <ResizeObserver style={ResizeObserverStyle} onResize={handleResize}>
                    <div ref={handleContainerRef} style={{ height: '100%' }} />
                </ResizeObserver>
            </StackItem>
        </>
    );
});
