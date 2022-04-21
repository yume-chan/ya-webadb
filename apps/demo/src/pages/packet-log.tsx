import { ICommandBarItemProps, Stack, StackItem } from "@fluentui/react";
import { makeStyles, mergeClasses, shorthands } from "@griffel/react";
import { AdbCommand, decodeUtf8 } from "@yume-chan/adb";
import { makeAutoObservable } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { useMemo, useState } from "react";
import { CommandBar, Grid, GridCellProps, GridColumn, GridHeaderProps, GridRowProps } from "../components";
import { globalState, PacketLogItem } from "../state";
import { Icons, RouteStackProps, useCallbackRef, withDisplayName } from "../utils";

const ADB_COMMAND_NAME = {
    [AdbCommand.Auth]: 'AUTH',
    [AdbCommand.Close]: 'CLSE',
    [AdbCommand.Connect]: 'CNXN',
    [AdbCommand.OK]: 'OKAY',
    [AdbCommand.Open]: 'OPEN',
    [AdbCommand.Write]: 'WRTE',
};

interface Column<T> extends GridColumn {
    title: string;
}

const LINE_HEIGHT = 32;

const PRINTABLE_CHARACTERS: [number, number][] = [
    [33, 126],
    [161, 172],
    [174, 255],
];

function isPrintableCharacter(code: number) {
    return PRINTABLE_CHARACTERS.some(
        ([start, end]) =>
            code >= start &&
            code <= end
    );
}

function toCharacter(code: number) {
    if (isPrintableCharacter(code))
        return String.fromCharCode(code);
    return '.';
}

function toText(data: Uint8Array) {
    let result = '';
    for (const code of data) {
        result += toCharacter(code);
    }
    return result;
}

const state = new class {
    get commandBarItems(): ICommandBarItemProps[] {
        return [
            {
                key: 'clear',
                disabled: !globalState.device,
                iconProps: { iconName: Icons.Delete },
                text: 'Clear',
                onClick: () => globalState.clearLog(),
            }
        ];
    }

    constructor() {
        makeAutoObservable(this);
    }
};

const useClasses = makeStyles({
    grid: {
        height: '100%',
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

const PacketLog: NextPage = () => {
    const classes = useClasses();

    const columns: Column<PacketLogItem>[] = useMemo(() => [
        {
            key: 'direction',
            title: 'Direction',
            width: 100,
            CellComponent: withDisplayName('Direction')(({ className, rowIndex, ...rest }: GridCellProps) => {
                const item = globalState.logs[rowIndex];

                return (
                    <div
                        className={mergeClasses(className, classes.code)}
                        {...rest}
                    >
                        {item.direction}
                    </div>
                );
            }),
        },
        {
            key: 'command',
            title: 'Command',
            width: 100,
            CellComponent: withDisplayName('Command')(({ className, rowIndex, ...rest }: GridCellProps) => {
                const item = globalState.logs[rowIndex];

                if (!item.commandString) {
                    item.commandString =
                        ADB_COMMAND_NAME[item.command as AdbCommand] ??
                        decodeUtf8(new Uint32Array([item.command]));
                }

                return (
                    <div
                        className={mergeClasses(className, classes.code)}
                        {...rest}
                    >
                        {item.commandString}
                    </div>
                );
            }),
        },
        {
            key: 'arg0',
            title: 'Arg0',
            width: 100,
            CellComponent: withDisplayName('Command')(({ className, rowIndex, ...rest }: GridCellProps) => {
                const item = globalState.logs[rowIndex];

                if (!item.arg0String) {
                    item.arg0String = item.arg0.toString(16).padStart(8, '0');
                }

                return (
                    <div
                        className={mergeClasses(className, classes.code)}
                        {...rest}
                    >
                        {item.arg0String}
                    </div>
                );
            }),
        },
        {
            key: 'arg1',
            title: 'Arg1',
            width: 100,
            CellComponent: withDisplayName('Command')(({ className, rowIndex, ...rest }: GridCellProps) => {
                const item = globalState.logs[rowIndex];

                if (!item.arg1String) {
                    item.arg1String = item.arg0.toString(16).padStart(8, '0');
                }

                return (
                    <div
                        className={mergeClasses(className, classes.code)}
                        {...rest}
                    >
                        {item.arg1String}
                    </div>
                );
            }),
        },
        {
            key: 'payload',
            title: 'Payload',
            width: 200,
            flexGrow: 1,
            CellComponent: withDisplayName('Command')(({ className, rowIndex, ...rest }: GridCellProps) => {
                const item = globalState.logs[rowIndex];

                if (!item.payloadString) {
                    item.payloadString = toText(item.payload.subarray(0, 100));
                }

                return (
                    <div
                        className={mergeClasses(className, classes.code)}
                        {...rest}
                    >
                        {item.payloadString}
                    </div>
                );
            }),
        },
    ], [classes.code]);

    const [selectedRowIndex, setSelectedRowIndex] = useState(-1);

    const Header = useMemo(() => withDisplayName('Header')(({ className, columnIndex, ...rest }: GridHeaderProps) => {
        return (
            <div className={mergeClasses(className, classes.header)} {...rest}>
                {columns[columnIndex].title}
            </div>
        );
    }), []);

    const Row = useMemo(() => withDisplayName('Row')(({
        className,
        rowIndex,
        ...rest
    }: GridRowProps) => {
        const handleClick = useCallbackRef(() => {
            setSelectedRowIndex(rowIndex);
        });

        return (
            <div
                className={mergeClasses(
                    className,
                    classes.row,
                    selectedRowIndex === rowIndex && classes.selected
                )}
                onClick={handleClick}
                {...rest}
            />
        );
    }), [classes, selectedRowIndex]);

    return (
        <Stack {...RouteStackProps} tokens={{}}>
            <Head>
                <title>Packet Log - Android Web Toolbox</title>
            </Head>

            <CommandBar items={state.commandBarItems} />

            <StackItem basis={0} grow>
                <Grid
                    className={classes.grid}
                    rowCount={globalState.logs.length}
                    rowHeight={LINE_HEIGHT}
                    columns={columns}
                    HeaderComponent={Header}
                    RowComponent={Row}
                />
            </StackItem>

            <StackItem grow>
                {selectedRowIndex !== -1 && (
                    <div>

                    </div>
                )}
            </StackItem>
        </Stack>
    );
};

export default observer(PacketLog);
