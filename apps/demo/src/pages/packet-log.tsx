import { ICommandBarItemProps, Stack, StackItem } from "@fluentui/react";
import { makeStyles, mergeClasses, shorthands } from "@griffel/react";
import { AdbCommand, decodeUtf8 } from "@yume-chan/adb";
import { action, autorun, makeAutoObservable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { PointerEvent } from "react";
import {
    CommandBar,
    Grid,
    GridCellProps,
    GridColumn,
    GridHeaderProps,
    GridRowProps,
    HexViewer,
    ObservableListSelection,
    isModKey,
    toText,
} from "../components";
import { GLOBAL_STATE } from "../state";
import {
    Icons,
    RouteStackProps,
    useStableCallback,
    withDisplayName,
} from "../utils";

const ADB_COMMAND_NAME = {
    [AdbCommand.Auth]: "AUTH",
    [AdbCommand.Close]: "CLSE",
    [AdbCommand.Connect]: "CNXN",
    [AdbCommand.OK]: "OKAY",
    [AdbCommand.Open]: "OPEN",
    [AdbCommand.Write]: "WRTE",
};

interface Column extends GridColumn {
    title: string;
}

const LINE_HEIGHT = 32;

function uint8ArrayToHexString(array: Uint8Array) {
    return Array.from(array)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(" ");
}

const state = new (class {
    get empty() {
        return !GLOBAL_STATE.logs.length;
    }

    get commandBarItems(): ICommandBarItemProps[] {
        return [
            {
                key: "clear",
                disabled: this.empty,
                iconProps: { iconName: Icons.Delete },
                text: "Clear",
                onClick: action(() => GLOBAL_STATE.clearLog()),
            },
            {
                key: "select-all",
                disabled: this.empty,
                iconProps: { iconName: Icons.Wand },
                text: "Select All",
                onClick: action(() => {
                    this.selection.clear();
                    this.selection.select(
                        GLOBAL_STATE.logs.length - 1,
                        false,
                        true
                    );
                }),
            },
            {
                key: "copy",
                disabled: this.selection.size === 0,
                iconProps: { iconName: Icons.Copy },
                text: "Copy",
                onClick: () => {
                    let text = "";
                    for (const index of this.selection) {
                        const entry = GLOBAL_STATE.logs[index];
                        // prettier-ignore
                        text += `${
                            entry.timestamp!.toISOString()
                        }\t${
                            entry.direction === 'in' ? "IN" : "OUT"
                        }\t${
                            ADB_COMMAND_NAME[entry.command as keyof typeof ADB_COMMAND_NAME]
                        }\t${
                            entry.arg0.toString(16).padStart(8,'0')
                        }\t${
                            entry.arg1.toString(16).padStart(8,'0')
                        }\t${
                            uint8ArrayToHexString(entry.payload)
                        }\n`;
                    }
                    navigator.clipboard.writeText(text);
                },
            },
        ];
    }

    selection = new ObservableListSelection();

    constructor() {
        makeAutoObservable(this, {});

        autorun(() => {
            if (GLOBAL_STATE.logs.length === 0) {
                runInAction(() => this.selection.clear());
            }
        });
    }
})();

const useClasses = makeStyles({
    grow: {
        height: 0,
    },
    grid: {
        height: "100%",
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
    hexViewer: {
        ...shorthands.padding("12px"),
        ...shorthands.borderTop("1px", "solid", "rgb(243, 242, 241)"),
    },
});

const columns: Column[] = [
    {
        title: "Direction",
        width: 100,
        CellComponent: withDisplayName("Direction")(
            ({ className, rowIndex, ...rest }: GridCellProps) => {
                const item = GLOBAL_STATE.logs[rowIndex];

                const classes = useClasses();

                return (
                    <div
                        className={mergeClasses(className, classes.code)}
                        {...rest}
                    >
                        {item.direction}
                    </div>
                );
            }
        ),
    },
    {
        title: "Command",
        width: 100,
        CellComponent: withDisplayName("Command")(
            ({ className, rowIndex, ...rest }: GridCellProps) => {
                const item = GLOBAL_STATE.logs[rowIndex];

                if (!item.commandString) {
                    item.commandString =
                        ADB_COMMAND_NAME[item.command as AdbCommand] ??
                        decodeUtf8(new Uint32Array([item.command]));
                }

                const classes = useClasses();

                return (
                    <div
                        className={mergeClasses(className, classes.code)}
                        {...rest}
                    >
                        {item.commandString}
                    </div>
                );
            }
        ),
    },
    {
        title: "Arg0",
        width: 100,
        CellComponent: withDisplayName("Command")(
            ({ className, rowIndex, ...rest }: GridCellProps) => {
                const item = GLOBAL_STATE.logs[rowIndex];

                if (!item.arg0String) {
                    item.arg0String = item.arg0.toString(16).padStart(8, "0");
                }

                const classes = useClasses();

                return (
                    <div
                        className={mergeClasses(className, classes.code)}
                        {...rest}
                    >
                        {item.arg0String}
                    </div>
                );
            }
        ),
    },
    {
        title: "Arg1",
        width: 100,
        CellComponent: withDisplayName("Command")(
            ({ className, rowIndex, ...rest }: GridCellProps) => {
                const item = GLOBAL_STATE.logs[rowIndex];

                if (!item.arg1String) {
                    item.arg1String = item.arg1.toString(16).padStart(8, "0");
                }

                const classes = useClasses();

                return (
                    <div
                        className={mergeClasses(className, classes.code)}
                        {...rest}
                    >
                        {item.arg1String}
                    </div>
                );
            }
        ),
    },
    {
        title: "Payload",
        width: 200,
        flexGrow: 1,
        CellComponent: withDisplayName("Command")(
            ({ className, rowIndex, ...rest }: GridCellProps) => {
                const item = GLOBAL_STATE.logs[rowIndex];

                if (!item.payloadString) {
                    item.payloadString = toText(item.payload.subarray(0, 100));
                }

                const classes = useClasses();

                return (
                    <div
                        className={mergeClasses(className, classes.code)}
                        {...rest}
                    >
                        {item.payloadString}
                    </div>
                );
            }
        ),
    },
];

const Header = withDisplayName("Header")(
    ({ className, columnIndex, ...rest }: GridHeaderProps) => {
        const classes = useClasses();

        return (
            <div className={mergeClasses(className, classes.header)} {...rest}>
                {columns[columnIndex].title}
            </div>
        );
    }
);

const Row = observer(function Row({
    className,
    rowIndex,
    ...rest
}: GridRowProps) {
    const classes = useClasses();

    const handlePointerDown = useStableCallback(
        (e: PointerEvent<HTMLDivElement>) => {
            runInAction(() => {
                if (e.shiftKey) {
                    e.preventDefault();
                }
                state.selection.select(rowIndex, isModKey(e), e.shiftKey);
            });
        }
    );

    return (
        <div
            className={mergeClasses(
                className,
                classes.row,
                state.selection.has(rowIndex) && classes.selected
            )}
            onPointerDown={handlePointerDown}
            {...rest}
        />
    );
});

const PacketLog: NextPage = () => {
    const classes = useClasses();

    return (
        <Stack {...RouteStackProps} tokens={{}}>
            <Head>
                <title>Packet Log - Tango</title>
            </Head>

            <CommandBar items={state.commandBarItems} />

            <StackItem className={classes.grow} grow>
                <Grid
                    className={classes.grid}
                    rowCount={GLOBAL_STATE.logs.length}
                    rowHeight={LINE_HEIGHT}
                    columns={columns}
                    HeaderComponent={Header}
                    RowComponent={Row}
                />
            </StackItem>

            {state.selection.selectedIndex !== null &&
                GLOBAL_STATE.logs[state.selection.selectedIndex].payload
                    .length > 0 && (
                    <StackItem className={classes.grow} grow>
                        <HexViewer
                            className={classes.hexViewer}
                            data={
                                GLOBAL_STATE.logs[state.selection.selectedIndex]
                                    .payload
                            }
                        />
                    </StackItem>
                )}
        </Stack>
    );
};

export default observer(PacketLog);
