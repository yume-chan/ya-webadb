import { WebAdb } from '@yume-chan/webadb';
import React, { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { useRouteMatch } from 'react-router-dom';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
// import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';
import ResizeObserver from './ResizeObserver';
import withDisplayName from './withDisplayName';

const containerStyle: CSSProperties = {
    width: '100%',
    height: '100%',
};

export default withDisplayName('Shell', ({
    device
}: { device?: WebAdb }): JSX.Element | null => {
    const routeMatch = useRouteMatch();
    const [cached, setCached] = useState(false);
    useEffect(() => {
        setCached(true);
    }, [routeMatch]);

    const terminalRef = useRef<Terminal>();
    const fitAddonRef = useRef<FitAddon>();
    const handleContainerRef = useCallback((element: HTMLDivElement | null) => {
        if (!element) {
            return;
        }

        const terminal = new Terminal({
            scrollback: 9001,
        });

        const fitAddon = new FitAddon();
        fitAddonRef.current = fitAddon;
        terminal.loadAddon(fitAddon);

        terminalRef.current = terminal;
        terminal.open(element);
        fitAddon.fit();
    }, []);
    useEffect(() => {
        return () => terminalRef.current?.dispose();
    }, []);

    useEffect(() => {
        if (!device || !terminalRef.current) {
            return;
        }

        (async () => {
            const shell = await device.shell();
            const textEncoder = new TextEncoder();
            terminalRef.current!.onData(data => {
                const { buffer } = textEncoder.encode(data);
                shell.write(buffer);
            });
            shell.onData(data => {
                terminalRef.current!.write(new Uint8Array(data));
            });
        })();

        return () => {
            terminalRef.current!.reset();
            terminalRef.current!.clear();
        };
    }, [device, terminalRef.current]);

    const handleResize = useCallback(() => {
        fitAddonRef.current?.fit();
    }, []);

    if (!cached) {
        return null;
    }

    return (
        <ResizeObserver style={containerStyle} onResize={handleResize}>
            <div ref={handleContainerRef} style={{ height: '100%' }} />
        </ResizeObserver>
    )
});
