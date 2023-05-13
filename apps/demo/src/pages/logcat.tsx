import {
    ContextualMenuItemType,
    ICommandBarItemProps,
    Stack,
    StackItem,
    isMac,
} from "@fluentui/react";
import { makeStyles, mergeClasses, shorthands } from "@griffel/react";
import {
    AndroidLogEntry,
    AndroidLogPriority,
    Logcat,
    LogcatFormat,
} from "@yume-chan/android-bin";
import {
    AbortController,
    ReadableStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import { encodeUtf8 } from "@yume-chan/struct";
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
import { KeyboardEvent, PointerEvent, useCallback } from "react";

import {
    CommandBar,
    Grid,
    GridColumn,
    GridHeaderProps,
    GridRowProps,
    ObservableListSelection,
    isModKey,
} from "../components";
import { CommandBarSpacerItem } from "../components/command-bar-spacer-item";
import { GLOBAL_STATE } from "../state";
import { Icons, RouteStackProps, saveFile, useStableCallback } from "../utils";

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
    // Android Studio Classic Light theme
    rowVerbose: {
        color: "#000000",
    },
    rowDebug: {
        color: "#000000",
    },
    rowInfo: {
        color: "#000000",
    },
    rowWarn: {
        color: "#645607",
    },
    rowError: {
        color: "#CD0000",
    },
    rowFatal: {
        color: "#CD0000",
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
        selection: new ObservableListSelection(),
        count: 0,
        stream: undefined as ReadableStream<AndroidLogEntry> | undefined,
        stopSignal: undefined as AbortController | undefined,
        animationFrameId: undefined as number | undefined,

        format: LogcatFormat.ThreadTime,
        formatModifierUid: false,
        formatModifierTimezone: false,
        formatTime: "default" as "year" | "default" | "epoch" | "monotonic",
        formatNanosecond: "millisecond" as
            | "millisecond"
            | "microsecond"
            | "nanosecond",

        formatEntry(entry: LogRow) {
            return entry.toString(this.format, {
                uid: this.formatModifierUid,
                year: this.formatTime === "year",
                epoch: this.formatTime === "epoch",
                monotonic: this.formatTime === "monotonic",
                microseconds: this.formatNanosecond === "microsecond",
                nanoseconds: this.formatNanosecond === "nanosecond",
                timezone: this.formatModifierTimezone,
            });
        },

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
                .catch((e) => {
                    if (this.stopSignal?.signal.aborted) {
                        return;
                    }

                    throw e;
                });
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
                    key: "select-all",
                    disabled: this.empty,
                    iconProps: { iconName: Icons.Wand },
                    text: "Select All",
                    onClick: action(() => {
                        this.selection.clear();
                        this.selection.select(
                            this.list.length - 1,
                            false,
                            true
                        );
                    }),
                },
                {
                    key: "copy",
                    text: "Copy Selected",
                    disabled: this.selection.size === 0,
                    iconProps: { iconName: Icons.Copy },
                    onClick: () => {
                        let text = "";
                        for (const index of this.selection) {
                            text += this.formatEntry(this.list[index]) + "\n";
                        }
                        // Chrome on Windows can't copy null characters
                        text = text.replace(/\u0000/g, "");
                        navigator.clipboard.writeText(text);
                    },
                },
                {
                    key: "save",
                    text: "Save Selected",
                    disabled: this.selection.size === 0,
                    iconProps: { iconName: Icons.Save },
                    onClick: () => {
                        const stream = saveFile(`logcat.txt`);
                        const writer = stream.getWriter();
                        for (const index of this.selection) {
                            writer.write(
                                encodeUtf8(
                                    this.formatEntry(this.list[index]) + "\n"
                                )
                            );
                        }
                        writer.close();
                    },
                },

                {
                    // HACK: make CommandBar overflow on far items
                    // https://github.com/microsoft/fluentui/issues/11842
                    key: "spacer",
                    onRender: () => <CommandBarSpacerItem />,
                },
                {
                    // HACK: add a separator in CommandBar overflow menu
                    // https://github.com/microsoft/fluentui/issues/10035
                    key: "separator",
                    disabled: true,
                    itemType: ContextualMenuItemType.Divider,
                },

                {
                    key: "format",
                    iconProps: { iconName: Icons.TextGrammarSettings },
                    text: "Format",
                    subMenuProps: {
                        items: [
                            {
                                key: "format",
                                text: "Format",
                                itemType: ContextualMenuItemType.Header,
                            },
                            {
                                key: "brief",
                                text: "Brief",
                                canCheck: true,
                                itemProps: {
                                    radioGroup: "format",
                                },
                                checked: this.format === LogcatFormat.Brief,
                                onClick: action((e) => {
                                    e?.preventDefault();
                                    e?.stopPropagation();
                                    this.format = LogcatFormat.Brief;
                                }),
                            },
                            {
                                key: "process",
                                text: "Process",
                                canCheck: true,
                                itemProps: {
                                    radioGroup: "format",
                                },
                                checked: this.format === LogcatFormat.Process,
                                onClick: action((e) => {
                                    e?.preventDefault();
                                    e?.stopPropagation();
                                    this.format = LogcatFormat.Process;
                                }),
                            },
                            {
                                key: "tag",
                                text: "Tag",
                                canCheck: true,
                                itemProps: {
                                    radioGroup: "format",
                                },
                                checked: this.format === LogcatFormat.Tag,
                                onClick: action((e) => {
                                    e?.preventDefault();
                                    e?.stopPropagation();
                                    this.format = LogcatFormat.Tag;
                                }),
                            },
                            {
                                key: "thread",
                                text: "Thread",
                                canCheck: true,
                                itemProps: {
                                    radioGroup: "format",
                                },
                                checked: this.format === LogcatFormat.Thread,
                                onClick: action((e) => {
                                    e?.preventDefault();
                                    e?.stopPropagation();
                                    this.format = LogcatFormat.Thread;
                                }),
                            },
                            {
                                key: "raw",
                                text: "Raw",
                                canCheck: true,
                                itemProps: {
                                    radioGroup: "format",
                                },
                                checked: this.format === LogcatFormat.Raw,
                                onClick: action((e) => {
                                    e?.preventDefault();
                                    e?.stopPropagation();
                                    this.format = LogcatFormat.Raw;
                                }),
                            },
                            {
                                key: "time",
                                text: "Time",
                                canCheck: true,
                                itemProps: {
                                    radioGroup: "format",
                                },
                                checked: this.format === LogcatFormat.Time,
                                onClick: action((e) => {
                                    e?.preventDefault();
                                    e?.stopPropagation();
                                    this.format = LogcatFormat.Time;
                                }),
                            },
                            {
                                key: "thread-time",
                                text: "ThreadTime",
                                canCheck: true,
                                itemProps: {
                                    radioGroup: "format",
                                },
                                checked:
                                    this.format === LogcatFormat.ThreadTime,
                                onClick: action((e) => {
                                    e?.preventDefault();
                                    e?.stopPropagation();
                                    this.format = LogcatFormat.ThreadTime;
                                }),
                            },
                            {
                                key: "long",
                                text: "Long",
                                canCheck: true,
                                itemProps: {
                                    radioGroup: "format",
                                },
                                checked: this.format === LogcatFormat.Long,
                                onClick: action((e) => {
                                    e?.preventDefault();
                                    e?.stopPropagation();
                                    this.format = LogcatFormat.Long;
                                }),
                            },

                            {
                                key: "modifiers",
                                text: "Modifiers",
                                itemType: ContextualMenuItemType.Header,
                            },
                            {
                                key: "uid",
                                text: "UID",
                                canCheck: true,
                                checked: this.formatModifierUid,
                                onClick: action((e) => {
                                    e?.preventDefault();
                                    e?.stopPropagation();
                                    this.formatModifierUid =
                                        !this.formatModifierUid;
                                }),
                            },
                            {
                                key: "timezone",
                                text: "Timezone",
                                canCheck: true,
                                checked: this.formatModifierTimezone,
                                onClick: action((e) => {
                                    e?.preventDefault();
                                    e?.stopPropagation();
                                    this.formatModifierTimezone =
                                        !this.formatModifierTimezone;
                                }),
                            },

                            {
                                key: "time-header",
                                text: "Time Format",
                                itemType: ContextualMenuItemType.Header,
                            },
                            {
                                key: "default",
                                text: "Default",
                                canCheck: true,
                                itemProps: {
                                    radioGroup: "time",
                                },
                                checked: this.formatTime === "default",
                                onClick: action((e) => {
                                    e?.preventDefault();
                                    e?.stopPropagation();
                                    this.formatTime = "default";
                                }),
                            },
                            {
                                key: "year",
                                text: "Year",
                                canCheck: true,
                                itemProps: {
                                    radioGroup: "time",
                                },
                                checked: this.formatTime === "year",
                                onClick: action((e) => {
                                    e?.preventDefault();
                                    e?.stopPropagation();
                                    this.formatTime = "year";
                                }),
                            },
                            {
                                key: "epoch",
                                text: "Epoch",
                                canCheck: true,
                                itemProps: {
                                    radioGroup: "time",
                                },
                                checked: this.formatTime === "epoch",
                                onClick: action((e) => {
                                    e?.preventDefault();
                                    e?.stopPropagation();
                                    this.formatTime = "epoch";
                                }),
                            },
                            {
                                key: "monotonic",
                                text: "Monotonic",
                                canCheck: true,
                                itemProps: {
                                    radioGroup: "time",
                                },
                                checked: this.formatTime === "monotonic",
                                onClick: action((e) => {
                                    e?.preventDefault();
                                    e?.stopPropagation();
                                    this.formatTime = "monotonic";
                                }),
                            },

                            {
                                key: "nanosecondFormat",
                                text: "Nanosecond Format",
                                itemType: ContextualMenuItemType.Header,
                            },
                            {
                                key: "millisecond",
                                text: "Millisecond",
                                canCheck: true,
                                itemProps: {
                                    radioGroup: "nanosecond",
                                },
                                checked:
                                    this.formatNanosecond === "millisecond",
                                onClick: action((e) => {
                                    e?.preventDefault();
                                    e?.stopPropagation();
                                    this.formatNanosecond = "millisecond";
                                }),
                            },
                            {
                                key: "microsecond",
                                text: "Microsecond",
                                canCheck: true,
                                itemProps: {
                                    radioGroup: "nanosecond",
                                },
                                checked:
                                    this.formatNanosecond === "microsecond",
                                onClick: action((e) => {
                                    e?.preventDefault();
                                    e?.stopPropagation();
                                    this.formatNanosecond = "microsecond";
                                }),
                            },
                            {
                                key: "nanosecond",
                                text: "Nanosecond",
                                canCheck: true,
                                itemProps: {
                                    radioGroup: "nanosecond",
                                },
                                checked: this.formatNanosecond === "nanosecond",
                                onClick: action((e) => {
                                    e?.preventDefault();
                                    e?.stopPropagation();
                                    this.formatNanosecond = "nanosecond";
                                }),
                            },
                        ],
                    },
                },
            ];
        },
        get columns(): Column[] {
            return [
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
                                item.seconds * 1000
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

const PRIORITY_COLORS: Record<
    AndroidLogPriority,
    keyof ReturnType<typeof useClasses>
> = {
    [AndroidLogPriority.Default]: "rowVerbose",
    [AndroidLogPriority.Unknown]: "rowVerbose",
    [AndroidLogPriority.Silent]: "rowVerbose",
    [AndroidLogPriority.Verbose]: "rowVerbose",
    [AndroidLogPriority.Debug]: "rowDebug",
    [AndroidLogPriority.Info]: "rowInfo",
    [AndroidLogPriority.Warn]: "rowWarn",
    [AndroidLogPriority.Error]: "rowError",
    [AndroidLogPriority.Fatal]: "rowFatal",
};

const Row = observer(function Row({
    className,
    rowIndex,
    ...rest
}: GridRowProps) {
    const classes = useClasses();

    const handlePointerDown = useStableCallback(
        action((e: PointerEvent<HTMLDivElement>) => {
            if (e.shiftKey) {
                e.preventDefault();
            }
            state.selection.select(rowIndex, isModKey(e), e.shiftKey);
        })
    );

    return (
        <div
            className={mergeClasses(
                className,
                classes.row,
                state.selection.has(rowIndex) && classes.selected,
                classes[PRIORITY_COLORS[state.list[rowIndex]!.priority]]
            )}
            onPointerDown={handlePointerDown}
            {...rest}
        />
    );
});

const LogcatPage: NextPage = () => {
    const classes = useClasses();

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
        if ((isMac() ? e.metaKey : e.ctrlKey) && e.code === "KeyA") {
            e.preventDefault();
            e.stopPropagation();
            state.selection.clear();
            state.selection.select(state.list.length - 1, false, true);
            return;
        }

        if (e.code === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            state.selection.clear();
            return;
        }
    }, []);

    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>Logcat - Tango</title>
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
                    onKeyDown={handleKeyDown}
                />
            </StackItem>
        </Stack>
    );
};

export default observer(LogcatPage);
