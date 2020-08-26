import { Adb } from '@yume-chan/adb';
import React, { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
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

export interface ShellProps {
    device: Adb | undefined;

    visible: boolean;
}

export default withDisplayName('Shell', ({
    device,
    visible,
}: ShellProps): JSX.Element | null => {
    const [cached, setCached] = useState(false);
    useEffect(() => {
        if (visible) {
            setCached(true);
        }
    }, [visible]);

    const [terminal, setTerminal] = useState<Terminal>();
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
            const textEncoder = new TextEncoder();
            terminal.onData(data => {
                const { buffer } = textEncoder.encode(data);
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

    if (!cached) {
        return null;
    }

    return (
        <ResizeObserver style={containerStyle} onResize={handleResize}>
            <div ref={handleContainerRef} style={{ height: '100%' }} />
        </ResizeObserver>
    )
});
