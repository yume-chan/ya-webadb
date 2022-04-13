import { ICommandBarItemProps, mergeStyleSets, Stack, StackItem } from "@fluentui/react";
import { useMergedRefs } from "@fluentui/react-hooks";
import { AdbCommand, decodeUtf8 } from "@yume-chan/adb";
import { makeAutoObservable, toJS } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { Children, createElement, CSSProperties, forwardRef, isValidElement, memo, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GridChildComponentProps, VariableSizeGrid, VariableSizeGridProps } from 'react-window';
import { CommandBar, ResizeObserver, Size } from "../components";
import { globalState, PacketLogItem } from "../state";
import { Icons, RouteStackProps } from "../utils";

const ADB_COMMAND_NAME = {
    [AdbCommand.Auth]: 'AUTH',
    [AdbCommand.Close]: 'CLSE',
    [AdbCommand.Connect]: 'CNXN',
    [AdbCommand.OK]: 'OKAY',
    [AdbCommand.Open]: 'OPEN',
    [AdbCommand.Write]: 'WRTE',
};

interface Column<T> {
    key: string;
    title: string;
    width?: number;
    flexGrow?: number;
    render: (value: T, style: CSSProperties) => JSX.Element;
}

const LINE_HEIGHT = 32;

interface GridProps extends Omit<VariableSizeGridProps<void>, 'width' | 'height'> {
    stickyRowCount?: number | undefined;
    // stickyColumnCount?: number | undefined;
}

const Grid = forwardRef<VariableSizeGrid, GridProps>(
    function Grid({
        rowCount,
        rowHeight,
        columnCount,
        columnWidth,
        children,
        ...props
    }, ref) {
        const styles = mergeStyleSets({
            container: {
                display: 'flex',
                flexDirection: 'column',
            },
            scroller: {
                flex: 1,
                height: 0,
                overflow: 'auto',
            },
            stickyRows: {
                flexShrink: 0,
            },
        });

        const gridRef = useRef<VariableSizeGrid<void> | null>(null);
        const combinedRef = useMergedRefs(ref, gridRef);

        const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 });

        useEffect(() => {
            gridRef.current?.resetAfterRowIndex(rowCount - 2);
        }, [rowCount]);

        const stickyRowCount = props.stickyRowCount ?? 0;
        // const stickyColumnCount = props.stickyColumnCount ?? 0;

        const stickyRowItems: ReactNode[] = [];

        if (gridRef.current) {
            let rowStartIndex = 0;
            const rowStopIndex = rowStartIndex + stickyRowCount;

            let [
                columnStartIndex,
                columnStopIndex,
                // @ts-expect-error
            ] = gridRef.current._getHorizontalRangeToRender();

            for (let rowIndex = rowStartIndex; rowIndex < rowStopIndex; rowIndex += 1) {
                for (let columnIndex = columnStartIndex; columnIndex <= columnStopIndex; columnIndex += 1) {
                    stickyRowItems.push(
                        createElement(children, {
                            rowIndex,
                            columnIndex,
                            data: undefined,
                            key: `${rowIndex}-${columnIndex}`,
                            // @ts-expect-error
                            style: gridRef.current._getItemStyle(rowIndex, columnIndex),
                        })
                    );
                }
            }
        }

        return (
            <div>
                <div className={styles.stickyRows}>
                    {stickyRowItems}
                </div>
                <ResizeObserver
                    className={styles.scroller}
                    onResize={setContainerSize}
                >
                    <VariableSizeGrid
                        {...props}
                        ref={combinedRef}
                        width={containerSize.width}
                        height={containerSize.height}
                        rowCount={rowCount}
                        rowHeight={rowHeight}
                        columnCount={columnCount}
                        columnWidth={columnWidth}
                    >
                        {children}
                    </VariableSizeGrid>
                </ResizeObserver>
            </div>
        );
    }
);

interface DataGridProps<T> {
    data: T[];
    columns: Column<T>[];
    rowHeight: number;
}

const DataGrid = <T extends unknown>({
    data,
    columns,
    rowHeight,
}: DataGridProps<T>) => {
    const styles = mergeStyleSets({
        container: {
            width: '100%',
            height: '100%',
        },
        grid: {
            position: 'absolute !important',
            top: 0,
            left: 0,
        },
    });

    const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 });
    const columnWidths = useMemo(() => {
        let distributableWidth = containerSize.width;
        let distributedSlices = 0;
        for (const column of columns) {
            if (column.width) {
                distributableWidth -= column.width;
            } else {
                distributedSlices += column.flexGrow ?? 1;
            }
        }
        const widthPerSlice = distributableWidth / distributedSlices;

        return columns.map(column => {
            if (column.width) {
                return column.width;
            } else {
                return widthPerSlice * (column.flexGrow ?? 1);
            }
        });
    }, [containerSize.width, columns]);
    const columnWidth = useCallback(
        (index: number) => columnWidths[index],
        [columnWidths]
    );

    const gridRef = useRef<VariableSizeGrid | null>(null);
    useEffect(() => {
        gridRef.current?.resetAfterColumnIndex(
            columns.findIndex(column => !column.width),
            true
        );
    }, [columns, columnWidths]);

    const DataGridItem = useMemo(() => memo(
        function DataGridItem({
            rowIndex,
            columnIndex,
            style,
        }: GridChildComponentProps<any>) {
            if (rowIndex === 0) {
                return (
                    <div
                        key={columns[columnIndex].key}
                        style={style}
                    >
                        {columns[columnIndex].title}
                    </div>
                );
            }
            return columns[columnIndex].render(data[rowIndex - 1], style);
        }),
        [columns, data]
    );

    return (
        <ResizeObserver
            className={styles.container}
            onResize={setContainerSize}
        >
            <Grid
                ref={gridRef}
                className={styles.grid}
                rowCount={data.length + 1}
                rowHeight={() => rowHeight}
                estimatedRowHeight={rowHeight}
                columnCount={columns.length}
                columnWidth={columnWidth}
                stickyRowCount={1}
            >
                {DataGridItem}
            </Grid>
        </ResizeObserver>
    );
};

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

const PacketLog: NextPage = () => {
    const styles = mergeStyleSets({
        header: {
            position: 'sticky',
            textAlign: 'center',
            fontWeight: 'bold',
            lineHeight: LINE_HEIGHT + 'px',
        },
        code: {
            fontFamily: 'monospace',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            lineHeight: LINE_HEIGHT + 'px',
        }
    });

    const columns: Column<PacketLogItem>[] = useMemo(() => [
        {
            key: 'direction',
            title: 'Direction',
            width: 100,
            render(item, style) {
                return (
                    <div
                        className={styles.code}
                        style={style}
                    >
                        {item.direction}
                    </div>
                );
            },
        },
        {
            key: 'command',
            title: 'Command',
            width: 100,
            render(item, style) {
                if (!item.commandString) {
                    item.commandString =
                        ADB_COMMAND_NAME[item.command as AdbCommand] ??
                        decodeUtf8(new Uint32Array([item.command]));
                }

                return (
                    <div
                        className={styles.code}
                        style={style}
                    >
                        {item.commandString}
                    </div>
                );
            }
        },
        {
            key: 'arg0',
            title: 'Arg0',
            width: 100,
            render(item, style) {
                if (!item.arg0String) {
                    item.arg0String = item.arg0.toString(16).padStart(8, '0');
                }

                return (
                    <div
                        className={styles.code}
                        style={style}
                    >
                        {item.arg0String}
                    </div>
                );
            }
        },
        {
            key: 'arg1',
            title: 'Arg1',
            width: 100,
            render(item, style) {
                if (!item.arg1String) {
                    item.arg1String = item.arg1.toString(16).padStart(8, '0');
                }

                return (
                    <div
                        className={styles.code}
                        style={style}
                    >
                        {item.arg1String}
                    </div>
                );
            }
        },
        {
            key: 'payload',
            title: 'Payload',
            render(item, style) {
                if (!item.payloadString) {
                    item.payloadString = toText(item.payload);
                }

                return (
                    <div
                        className={styles.code}
                        style={style}
                    >
                        {item.payloadString}
                    </div>
                );
            }
        }
    ], [styles.code]);

    return (
        <Stack {...RouteStackProps} tokens={{}}>
            <Head>
                <title>Packet Log - Android Web Toolbox</title>
            </Head>

            <CommandBar items={state.commandBarItems} />

            <StackItem grow shrink>
                <DataGrid
                    data={toJS(globalState.logs)}
                    columns={columns}
                    rowHeight={LINE_HEIGHT}
                />
            </StackItem>
        </Stack>
    );
};

export default observer(PacketLog);
