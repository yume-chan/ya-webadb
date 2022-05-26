import { ICommandBarItemProps, Stack, StackItem } from "@fluentui/react";
import { makeStyles, mergeClasses, shorthands } from "@griffel/react";
import { AbortController, decodeUtf8, ReadableStream, WritableStream } from '@yume-chan/adb';
import { Logcat, LogMessage, LogPriority } from '@yume-chan/android-bin';
import { autorun, makeAutoObservable, observable, runInAction, computed, action } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";

import { CommandBar, Grid, GridColumn, GridHeaderProps, GridRowProps } from "../components";
import { GlobalState } from "../state";
import { Icons, RouteStackProps, useStableCallback } from "../utils";

const LINE_HEIGHT = 32;

const useClasses = makeStyles({
    grid: {
        height: '100%',
        marginLeft: '-16px',
        marginRight: '-16px',
    },
    header: {
        textAlign: 'center',
        lineHeight: `${LINE_HEIGHT}px`,
    },
    row: {
        '&:hover': {
            backgroundColor: '#f3f2f1',
        },
    },
    selected: {
        backgroundColor: '#edebe9',
    },
    code: {
        fontFamily: 'monospace',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        lineHeight: LINE_HEIGHT + 'px',
        cursor: 'default',
        ...shorthands.overflow('hidden'),
    },
});

export interface Column extends GridColumn {
    title: string;
}

export interface LogRow extends LogMessage {
    timeString?: string;
    payloadString?: string;
}

const state = makeAutoObservable({
    logcat: undefined as Logcat | undefined,
    running: false,
    buffer: [] as LogRow[],
    flushRequested: false,
    list: [] as LogRow[],
    count: 0,
    stream: undefined as ReadableStream<LogMessage> | undefined,
    stopSignal: undefined as AbortController | undefined,
    selectedCount: 0,
    animationFrameId: undefined as number | undefined,
    start() {
        if (this.running) {
            return;
        }

        // Logcat always starts from beginning,
        // so don't append.
        this.list = [];

        this.running = true;
        this.stream = this.logcat!.binary();
        this.stopSignal = new AbortController();
        this.stream
            .pipeTo(
                new WritableStream({
                    write: (chunk) => {
                        this.buffer.push(chunk);
                        if (!this.flushRequested) {
                            this.flushRequested = true;
                            requestAnimationFrame(this.flush);
                        }
                    },
                }),
                { signal: this.stopSignal.signal }
            )
            .catch(() => { });
    },
    flush() {
        this.list.push(...this.buffer);
        this.buffer = [];
        this.flushRequested = false;
    },
    stop() {
        this.running = false;
        this.stopSignal!.abort();
    },
    clear() {
        this.list = [];
        this.selectedCount = 0;
    },
    get empty() {
        return this.list.length === 0;
    },
    get commandBar(): ICommandBarItemProps[] {
        return [
            this.running ? {
                key: "stop",
                text: "Stop",
                iconProps: { iconName: Icons.Stop },
                onClick: () => this.stop(),
            } : {
                key: "start",
                text: "Start",
                disabled: this.logcat === undefined,
                iconProps: { iconName: Icons.Play },
                onClick: () => this.start(),
            },
            {
                key: 'clear',
                text: 'Clear',
                disabled: this.empty,
                iconProps: { iconName: Icons.Delete },
                onClick: () => this.clear(),
            },
            {
                key: 'copyAll',
                text: 'Copy Rows',
                disabled: this.selectedCount === 0,
                iconProps: { iconName: Icons.Copy },
                onClick: () => {

                }
            },
            {
                key: 'copyText',
                text: 'Copy Messages',
                disabled: this.selectedCount === 0,
                iconProps: { iconName: Icons.Copy },
                onClick: () => {

                }
            }
        ];
    },
    get columns(): Column[] {
        return [
            {
                width: 200,
                title: 'Time',
                CellComponent: ({ rowIndex, columnIndex, className, ...rest }) => {
                    const item = this.list[rowIndex];
                    if (!item.timeString) {
                        item.timeString = new Date(item.second * 1000).toISOString();
                    }

                    const classes = useClasses();

                    return (
                        <div className={mergeClasses(classes.code, className)} {...rest}>
                            {item.timeString}
                        </div>
                    );
                }
            },
            {
                width: 80,
                title: 'PID',
                CellComponent: ({ rowIndex, columnIndex, className, ...rest }) => {
                    const item = this.list[rowIndex];

                    const classes = useClasses();

                    return (
                        <div className={mergeClasses(classes.code, className)} {...rest}>
                            {item.pid}
                        </div>
                    );
                }
            },
            {
                width: 80,
                title: 'TID',
                CellComponent: ({ rowIndex, columnIndex, className, ...rest }) => {
                    const item = this.list[rowIndex];

                    const classes = useClasses();

                    return (
                        <div className={mergeClasses(classes.code, className)} {...rest}>
                            {item.tid}
                        </div>
                    );
                }
            },
            {
                width: 100,
                title: 'Priority',
                CellComponent: ({ rowIndex, columnIndex, className, ...rest }) => {
                    const item = this.list[rowIndex];

                    const classes = useClasses();

                    return (
                        <div className={mergeClasses(classes.code, className)} {...rest}>
                            {LogPriority[item.priority]}
                        </div>
                    );
                }
            },
            {
                width: 300,
                flexGrow: 1,
                title: 'Payload',
                CellComponent: ({ rowIndex, columnIndex, className, ...rest }) => {
                    const item = this.list[rowIndex];
                    if (!item.payloadString) {
                        item.payloadString = decodeUtf8(item.payload);
                    }

                    const classes = useClasses();

                    return (
                        <div className={mergeClasses(classes.code, className)} {...rest}>
                            {item.payloadString}
                        </div>
                    );
                }
            },
        ];
    },
}, {
    buffer: false,
    list: observable.shallow,
    flush: action.bound,
});

autorun(() => {
    if (GlobalState.device) {
        runInAction(() => {
            state.logcat = new Logcat(GlobalState.device!);
        });
    } else {
        runInAction(() => {
            state.logcat = undefined;
            if (state.running) {
                state.stop();
            }
        });
    }
});

const Header = observer(function Header({
    className,
    columnIndex,
    ...rest
}: GridHeaderProps) {
    const classes = useClasses();

    return (
        <div className={mergeClasses(className, classes.header)} {...rest}>
            {state.columns[columnIndex].title}
        </div>
    );
});

const Row = function Row({
    className,
    rowIndex,
    ...rest
}: GridRowProps) {
    const item = state.list[rowIndex];
    const classes = useClasses();

    const handleClick = useStableCallback(() => {
        runInAction(() => {
        });
    });

    return (
        <div
            className={mergeClasses(
                className,
                classes.row,
            )}
            onClick={handleClick}
            {...rest}
        />
    );
};

const LogcatPage: NextPage = () => {
    const classes = useClasses();

    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>Logcat - Android Web Toolbox</title>
            </Head>

            <CommandBar items={state.commandBar} />

            <StackItem grow>
                <Grid
                    className={classes.grid}
                    rowCount={state.list.length}
                    rowHeight={LINE_HEIGHT}
                    columns={state.columns}
                    HeaderComponent={Header}
                    RowComponent={Row}
                />
            </StackItem>
        </Stack>
    );
};

export default observer(LogcatPage);
