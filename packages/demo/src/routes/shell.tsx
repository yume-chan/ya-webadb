import { IconButton, SearchBox, Stack, StackItem } from '@fluentui/react';
import { AdbStream } from '@yume-chan/adb';
import { encodeUtf8 } from '@yume-chan/adb-backend-web';
import { Disposable } from '@yume-chan/event';
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

export const Shell = withDisplayName('Shell')(({
    visible,
    device,
}: RouteProps): JSX.Element | null => {
    const { show: showErrorDialog } = useContext(ErrorDialogContext);

    const [findKeyword, setFindKeyword] = useState('');
    const findAddonRef = useRef<SearchAddon>();
    const handleFindKeywordChange = useCallback((e, newValue?: string) => {
        setFindKeyword(newValue ?? '');
        if (newValue) {
            findAddonRef.current!.findNext(newValue, { incremental: true });
        }
    }, []);
    const findPrevious = useCallback(() => {
        findAddonRef.current!.findPrevious(findKeyword);
    }, [findKeyword]);
    const findNext = useCallback(() => {
        findAddonRef.current!.findNext(findKeyword);
    }, [findKeyword]);

    const connectingRef = useRef(false);
    const terminalRef = useRef<Terminal>();
    const shellStreamRef = useRef<AdbStream>();
    const terminalDisposableRef = useRef<Disposable>();
    const connect = useCallback(async () => {
        if (!visible || !device || !terminalRef.current || connectingRef.current) {
            return;
        }

        try {
            connectingRef.current = true;

            const shell = await device.shell();
            shellStreamRef.current = shell;
            terminalDisposableRef.current = terminalRef.current.onData(data => {
                const buffer = encodeUtf8(data);
                shell.write(buffer);
            });
            shell.onData(data => {
                terminalRef.current!.write(new Uint8Array(data));
            });
        } catch (e) {
            showErrorDialog(e.message);
        }
    }, [visible, device]);
    const connectRef = useRef(connect);
    connectRef.current = connect;

    const fitAddonRef = useRef<FitAddon>();
    const handleContainerRef = useCallback((element: HTMLDivElement | null) => {
        if (!element) {
            return;
        }

        const terminal = new Terminal({
            scrollback: 9001,
        });
        terminalRef.current = terminal;

        const findAddon = new SearchAddon();
        findAddonRef.current = findAddon;
        terminal.loadAddon(findAddon);

        const fitAddon = new FitAddon();
        fitAddonRef.current = fitAddon;
        terminal.loadAddon(fitAddon);

        terminal.open(element);
        fitAddon.fit();

        connectRef.current();
    }, []);

    useEffect(() => {
        if (!device) {
            if (shellStreamRef.current) {
                terminalDisposableRef.current!.dispose();
                terminalDisposableRef.current = undefined;

                shellStreamRef.current!.close();
                shellStreamRef.current = undefined;

                terminalRef.current!.clear();
                terminalRef.current!.reset();

                connectingRef.current = false;
            }
            return;
        }

        if (!visible || shellStreamRef.current) {
            return;
        }

        connectRef.current();
    }, [device, visible]);

    const handleResize = useCallback(() => {
        fitAddonRef.current?.fit();
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
