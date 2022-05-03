import { IconButton, SearchBox, Stack, StackItem } from '@fluentui/react';
import { action, autorun, makeAutoObservable } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { useCallback, useEffect } from 'react';
import 'xterm/css/xterm.css';
import { ResizeObserver } from '../components';
import { GlobalState } from "../state";
import { Icons, RouteStackProps } from '../utils';

let terminal: import('../components/terminal').AdbTerminal;
if (typeof window !== 'undefined') {
    const { AdbTerminal } = await import('../components/terminal');
    terminal = new AdbTerminal();
}

const state = makeAutoObservable({
    visible: false,
    setVisible(value: boolean) {
        this.visible = value;
    },

    searchKeyword: '',
    setSearchKeyword(value: string) {
        this.searchKeyword = value;
        terminal.searchAddon.findNext(value, { incremental: true });
    },

    searchPrevious() {
        terminal.searchAddon.findPrevious(this.searchKeyword);
    },
    searchNext() {
        terminal.searchAddon.findNext(this.searchKeyword);
    }
}, {
    searchPrevious: action.bound,
    searchNext: action.bound,
});

autorun(() => {
    if (!terminal) {
        return;
    }

    if (!GlobalState.device) {
        terminal.socket = undefined;
        return;
    }

    if (!terminal.socket && state.visible) {
        GlobalState.device.subprocess.shell()
            .then(action(shell => {
                terminal.socket = shell;
            }), (e) => {
                GlobalState.showErrorDialog(e);
            });
    }
});

const UpIconProps = { iconName: Icons.ChevronUp };
const DownIconProps = { iconName: Icons.ChevronDown };

const Shell: NextPage = (): JSX.Element | null => {
    const handleSearchKeywordChange = useCallback((e, value?: string) => {
        state.setSearchKeyword(value ?? '');
    }, []);

    const handleResize = useCallback(() => {
        terminal.fit();
    }, []);

    const handleContainerRef = useCallback((container: HTMLDivElement | null) => {
        if (container) {
            terminal.setContainer(container);
        }
    }, []);

    useEffect(() => {
        state.setVisible(true);
        return () => {
            state.setVisible(false);
        };
    }, []);

    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>Interactive Shell - Android Web Toolbox</title>
            </Head>

            <StackItem>
                <Stack horizontal>
                    <StackItem grow>
                        <SearchBox
                            placeholder="Find"
                            value={state.searchKeyword}
                            onChange={handleSearchKeywordChange}
                            onSearch={state.searchNext}
                        />
                    </StackItem>
                    <StackItem>
                        <IconButton
                            disabled={!state.searchKeyword}
                            iconProps={UpIconProps}
                            onClick={state.searchPrevious}
                        />
                    </StackItem>
                    <StackItem>
                        <IconButton
                            disabled={!state.searchKeyword}
                            iconProps={DownIconProps}
                            onClick={state.searchNext}
                        />
                    </StackItem>
                </Stack>
            </StackItem>

            <StackItem grow styles={{ root: { position: 'relative', minHeight: 0 } }}>
                <ResizeObserver onResize={handleResize} />
                <div ref={handleContainerRef} style={{ height: '100%' }} />
            </StackItem>
        </Stack>
    );
};

export default observer(Shell);
