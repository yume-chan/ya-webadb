import {
    Checkbox,
    ICommandBarItemProps,
    Stack,
    StackItem,
} from "@fluentui/react";
import { makeStyles, mergeClasses, shorthands } from "@griffel/react";
import {
    AndroidLogEntry,
    AndroidLogPriority,
    Logcat,
    LogcatFormat,
    formatAndroidLogEntry,
} from "@yume-chan/android-bin";
import { BTree } from "@yume-chan/b-tree";
import {
    AbortController,
    ReadableStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import {
    action,
    autorun,
    makeAutoObservable,
    observable,
    runInAction,
} from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { FormEvent, useEffect, useState } from "react";

import {
    CommandBar,
    Grid,
    GridColumn,
    GridHeaderProps,
    GridRowProps,
} from "../components";
import { GLOBAL_STATE } from "../state";
import { Icons, RouteStackProps, useStableCallback } from "../utils";

const LINE_HEIGHT = 32;

const useClasses = makeStyles({
    grid: {
        height: "100%",
        marginLeft: "-16px",
        marginRight: "-16px",
    },
    header: {
        textAlign: "center",
        lineHeight: `${LINE_HEIGHT}px`,
    },
    row: {
        "&:hover": {
            backgroundColor: "#f3f2f1",
        },
    },
    selected: {
        backgroundColor: "#edebe9",
    },
    code: {
        fontFamily: "monospace",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        lineHeight: LINE_HEIGHT + "px",
        cursor: "default",
        ...shorthands.overflow("hidden"),
    },
});

export interface Column extends GridColumn {
    title: string;
}

export interface LogRow extends AndroidLogEntry {
    timeString?: string;
}

const state = makeAutoObservable(
    {
        logcat: undefined as Logcat | undefined,
        running: false,
        buffer: [] as LogRow[],
        flushRequested: false,
        list: [] as LogRow[],
        selection: new BTree(6),
        count: 0,
        stream: undefined as ReadableStream<AndroidLogEntry> | undefined,
        stopSignal: undefined as AbortController | undefined,
        selectedCount: 0,
        animationFrameId: undefined as number | undefined,
        start() {
            if (this.running) {
                return;
            }

            // Logcat has its internal buffer,
            // it will output all logs in the buffer when started.
            // so clear the list before starting.
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
                .catch(() => {});
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
            this.selection.clear();
            this.selectedCount = 0;
        },
        get empty() {
            return this.list.length === 0;
        },
        get commandBar(): ICommandBarItemProps[] {
            return [
                this.running
                    ? {
                          key: "stop",
                          text: "Stop",
                          iconProps: { iconName: Icons.Stop },
                          onClick: () => this.stop(),
                      }
                    : {
                          key: "start",
                          text: "Start",
                          disabled: this.logcat === undefined,
                          iconProps: { iconName: Icons.Play },
                          onClick: () => this.start(),
                      },
                {
                    key: "clear",
                    text: "Clear",
                    disabled: this.empty,
                    iconProps: { iconName: Icons.Delete },
                    onClick: () => this.clear(),
                },
                {
                    key: "copyAll",
                    text: "Copy Rows",
                    disabled: this.selectedCount === 0,
                    iconProps: { iconName: Icons.Copy },
                    onClick: () => {
                        let text = "";
                        for (const index of this.selection) {
                            text +=
                                formatAndroidLogEntry(
                                    this.list[index],
                                    LogcatFormat.Brief
                                ) + "\n";
                        }
                        // Chrome on Windows can't copy null characters
                        text = text.replace(/\u0000/g, "");
                        navigator.clipboard.writeText(text);
                    },
                },
                {
                    key: "copyText",
                    text: "Copy Messages",
                    disabled: this.selectedCount === 0,
                    iconProps: { iconName: Icons.Copy },
                    onClick: () => {
                        let text = "";
                        for (const index of this.selection) {
                            text += this.list[index].message + "\n";
                        }
                        // Chrome on Windows can't copy null characters
                        text = text.replace(/\u0000/g, "");
                        navigator.clipboard.writeText(text);
                    },
                },
            ];
        },
        get columns(): Column[] {
            return [
                {
                    width: 40,
                    title: "",
                    CellComponent: ({
                        rowIndex,
                        columnIndex,
                        className,
                        ...rest
                    }) => {
                        const [checked, setChecked] = useState(false);
                        useEffect(() => {
                            setChecked(this.selection.has(rowIndex));
                        }, [rowIndex]);

                        const handleChange = useStableCallback(
                            (e?: FormEvent<EventTarget>, checked?: boolean) => {
                                if (checked === undefined) {
                                    return;
                                }
                                if (checked) {
                                    this.selection.add(rowIndex);
                                    setChecked(true);
                                } else {
                                    this.selection.delete(rowIndex);
                                    setChecked(false);
                                }
                                runInAction(() => {
                                    // Trigger mobx
                                    this.selectedCount = this.selection.size;
                                });
                            }
                        );

                        return (
                            <Stack
                                className={className}
                                verticalAlign="center"
                                horizontalAlign="center"
                                {...rest}
                            >
                                <Checkbox
                                    checked={checked}
                                    onChange={handleChange}
                                />
                            </Stack>
                        );
                    },
                },
                {
                    width: 200,
                    title: "Time",
                    CellComponent: ({
                        rowIndex,
                        columnIndex,
                        className,
                        ...rest
                    }) => {
                        const item = this.list[rowIndex];
                        if (!item.timeString) {
                            item.timeString = new Date(
                                item.second * 1000
                            ).toISOString();
                        }

                        const classes = useClasses();

                        return (
                            <div
                                className={mergeClasses(
                                    classes.code,
                                    className
                                )}
                                {...rest}
                            >
                                {item.timeString}
                            </div>
                        );
                    },
                },
                {
                    width: 60,
                    title: "PID",
                    CellComponent: ({
                        rowIndex,
                        columnIndex,
                        className,
                        ...rest
                    }) => {
                        const item = this.list[rowIndex];

                        const classes = useClasses();

                        return (
                            <div
                                className={mergeClasses(
                                    classes.code,
                                    className
                                )}
                                {...rest}
                            >
                                {item.pid}
                            </div>
                        );
                    },
                },
                {
                    width: 60,
                    title: "TID",
                    CellComponent: ({
                        rowIndex,
                        columnIndex,
                        className,
                        ...rest
                    }) => {
                        const item = this.list[rowIndex];

                        const classes = useClasses();

                        return (
                            <div
                                className={mergeClasses(
                                    classes.code,
                                    className
                                )}
                                {...rest}
                            >
                                {item.tid}
                            </div>
                        );
                    },
                },
                {
                    width: 80,
                    title: "Priority",
                    CellComponent: ({
                        rowIndex,
                        columnIndex,
                        className,
                        ...rest
                    }) => {
                        const item = this.list[rowIndex];

                        const classes = useClasses();

                        return (
                            <div
                                className={mergeClasses(
                                    classes.code,
                                    className
                                )}
                                {...rest}
                            >
                                {AndroidLogPriority[item.priority]}
                            </div>
                        );
                    },
                },
                {
                    width: 300,
                    title: "Tag",
                    CellComponent: ({
                        rowIndex,
                        columnIndex,
                        className,
                        ...rest
                    }) => {
                        const item = this.list[rowIndex];

                        const classes = useClasses();

                        return (
                            <div
                                className={mergeClasses(
                                    classes.code,
                                    className
                                )}
                                {...rest}
                            >
                                {item.tag}
                            </div>
                        );
                    },
                },
                {
                    width: 300,
                    flexGrow: 1,
                    title: "Message",
                    CellComponent: ({
                        rowIndex,
                        columnIndex,
                        className,
                        ...rest
                    }) => {
                        const item = this.list[rowIndex];
                        const classes = useClasses();

                        return (
                            <div
                                className={mergeClasses(
                                    classes.code,
                                    className
                                )}
                                {...rest}
                            >
                                {item.message}
                            </div>
                        );
                    },
                },
            ];
        },
    },
    {
        buffer: false,
        list: observable.shallow,
        flush: action.bound,
    }
);

autorun(() => {
    if (GLOBAL_STATE.device) {
        runInAction(() => {
            state.logcat = new Logcat(GLOBAL_STATE.device!);
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

const Row = function Row({ className, rowIndex, ...rest }: GridRowProps) {
    const item = state.list[rowIndex];
    const classes = useClasses();

    const handleClick = useStableCallback(() => {
        runInAction(() => {});
    });

    return (
        <div
            className={mergeClasses(className, classes.row)}
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
