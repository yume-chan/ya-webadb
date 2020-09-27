import { IconButton, SearchBox, Stack, StackItem } from '@fluentui/react';
import { encodeUtf8 } from '@yume-chan/adb-backend-web';
import React, { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';
import { ResizeObserver, withDisplayName } from '../utils';
import { RouteProps } from './type';

const ResizeObserverStyle: CSSProperties = {
    width: '100%',
    height: '100%',
};

const UpIconProps = { iconName: 'ChevronUp' };
const DownIconProps = { iconName: 'ChevronDown' };

export const Shell = withDisplayName('Shell', ({
    device,
}: RouteProps): JSX.Element | null => {
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

    const [terminal, setTerminal] = useState<Terminal>();
    const fitAddonRef = useRef<FitAddon>();
    const handleContainerRef = useCallback((element: HTMLDivElement | null) => {
        if (!element) {
            return;
        }

        const terminal = new Terminal({
            scrollback: 9001,
        });

        const findAddon = new SearchAddon();
        findAddonRef.current = findAddon;
        terminal.loadAddon(findAddon);

        const fitAddon = new FitAddon();
        fitAddonRef.current = fitAddon;
        terminal.loadAddon(fitAddon);

        setTerminal(terminal);
        terminal.open(element);
        fitAddon.fit();
    }, []);
    useEffect(() => {
        return () => terminal?.dispose();
    }, []);

    useEffect(() => {
        if (!device || !terminal) {
            return;
        }

        (async () => {
            const shell = await device.shell();
            terminal.onData(data => {
                const buffer = encodeUtf8(data);
                shell.write(buffer);
            });
            shell.onData(data => {
                terminal.write(new Uint8Array(data));
            });
        })();

        return () => {
            terminal.reset();
            terminal.clear();
        };
    }, [device, terminal]);

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
