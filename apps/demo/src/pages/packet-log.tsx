import { ICommandBarItemProps, Stack, StackItem } from "@fluentui/react";
import { makeStyles, mergeClasses, shorthands } from "@griffel/react";
import { AdbCommand, decodeUtf8 } from "@yume-chan/adb";
import { autorun, makeAutoObservable, observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { useMemo } from "react";
import { CommandBar, Grid, GridCellProps, GridColumn, GridHeaderProps, GridRowProps, HexViewer, toText } from "../components";
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

interface Column extends GridColumn {
    title: string;
}

const LINE_HEIGHT = 32;

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

    selectedPacket: PacketLogItem | undefined = undefined;

    constructor() {
        makeAutoObservable(
            this,
            {
                selectedPacket: observable.ref,
            }
        );

        autorun(() => {
            if (globalState.logs.length === 0) {
                this.selectedPacket = undefined;
            }
        });
    }
};

const useClasses = makeStyles({
    grow: {
        height: 0,
    },
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
    hexViewer: {
        ...shorthands.padding('12px'),
        ...shorthands.borderTop('1px', 'solid', 'rgb(243, 242, 241)'),
    },
});

const PacketLog: NextPage = () => {
    const classes = useClasses();

    const columns: Column[] = useMemo(() => [
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

    const Header = useMemo(
        () => withDisplayName('Header')(({
            className,
            columnIndex,
            ...rest
        }: GridHeaderProps) => {
            return (
                <div className={mergeClasses(className, classes.header)} {...rest}>
                    {columns[columnIndex].title}
                </div>
            );
        }),
        [classes.header, columns]
    );

    const Row = useMemo(
        () => observer(function Row({
            className,
            rowIndex,
            ...rest
        }: GridRowProps) {
            /* eslint-disable-next-line */
            const handleClick = useCallbackRef(() => {
                runInAction(() => {
                    state.selectedPacket = globalState.logs[rowIndex];
                });
            });

            return (
                <div
                    className={mergeClasses(
                        className,
                        classes.row,
                        state.selectedPacket === globalState.logs[rowIndex] && classes.selected
                    )}
                    onClick={handleClick}
                    {...rest}
                />
            );
        }),
        [classes]
    );

    return (
        <Stack {...RouteStackProps} tokens={{}}>
            <Head>
                <title>Packet Log - Android Web Toolbox</title>
            </Head>

            <CommandBar items={state.commandBarItems} />

            <StackItem className={classes.grow} grow>
                <Grid
                    className={classes.grid}
                    rowCount={globalState.logs.length}
                    rowHeight={LINE_HEIGHT}
                    columns={columns}
                    HeaderComponent={Header}
                    RowComponent={Row}
                />
            </StackItem>

            {state.selectedPacket && state.selectedPacket.payload.length > 0 && (
                <StackItem className={classes.grow} grow>
                    <HexViewer className={classes.hexViewer} data={state.selectedPacket.payload} />
                </StackItem>
            )}
        </Stack>
    );
};

export default observer(PacketLog);
