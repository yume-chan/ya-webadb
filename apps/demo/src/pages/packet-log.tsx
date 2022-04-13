import { mergeStyleSets, Stack, StackItem } from "@fluentui/react";
import { useMergedRefs } from "@fluentui/react-hooks";
import { AdbCommand, decodeUtf8 } from "@yume-chan/adb";
import { toJS } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { Children, createElement, CSSProperties, forwardRef, isValidElement, memo, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GridChildComponentProps, VariableSizeGrid, VariableSizeGridProps } from 'react-window';
import { ResizeObserver, Size } from "../components";
import { globalState, PacketLogItem } from "../state";
import { RouteStackProps, useCallbackRef } from "../utils";

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

interface GridProps extends Omit<VariableSizeGridProps<void>, 'innerElementType'> {
    padding?: number | number[] | undefined;

    stickyRowCount?: number | undefined;
    // stickyColumnCount?: number | undefined;

    innerElementType?: never;
}

const Grid = forwardRef<VariableSizeGrid, GridProps>(
    function Grid({
        padding: _padding,
        rowCount: _rowCount,
        rowHeight: _rowHeight,
        columnCount: _columnCount,
        columnWidth: _columnWidth,
        children: _children,
        ...props
    }, ref) {
        const styles = mergeStyleSets({
            stickyRows: {
                position: 'sticky',
                top: 0,
            },
        });

        const gridRef = useRef<VariableSizeGrid<void> | null>(null);
        const combinedRef = useMergedRefs(ref, gridRef);

        const padding = useMemo(() => {
            if (typeof _padding === 'undefined') {
                return {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                };
            } else if (typeof _padding === 'number') {
                return {
                    top: _padding,
                    right: _padding,
                    bottom: _padding,
                    left: _padding,
                };
            } else {
                switch (_padding.length) {
                    case 1:
                        return {
                            top: _padding[0],
                            right: _padding[0],
                            bottom: _padding[0],
                            left: _padding[0],
                        };
                    case 2:
                        return {
                            top: _padding[0],
                            right: _padding[1],
                            bottom: _padding[0],
                            left: _padding[1],
                        };
                    case 3:
                        return {
                            top: _padding[0],
                            right: _padding[1],
                            bottom: _padding[2],
                            left: _padding[1],
                        };
                    default:
                        return {
                            top: _padding[0],
                            right: _padding[1],
                            bottom: _padding[2],
                            left: _padding[3],
                        };
                }
            }
        }, [_padding]);

        const rowCount = useMemo(() => {
            let rowCount = _rowCount;
            if (padding.top) {
                rowCount += 1;
            }
            if (padding.bottom) {
                rowCount += 1;
            }
            return rowCount;
        }, [padding, _rowCount]);

        useEffect(() => {
            gridRef.current?.resetAfterRowIndex(1);
        }, [padding.top]);

        useEffect(() => {
            gridRef.current?.resetAfterRowIndex(rowCount - 2);
        }, [padding.bottom, rowCount]);

        const rowHeight = useCallback((index: number) => {
            if (padding.top) {
                if (index === 0) {
                    return padding.top;
                }
                index -= 1;
            }
            if (padding.bottom) {
                if (index === _rowCount) {
                    return padding.bottom;
                }
            }
            return _rowHeight(index);
        }, [padding, _rowCount, _rowHeight]);

        const columnCount = useMemo(() => {
            let columnCount = _columnCount;
            if (padding.left) {
                columnCount += 1;
            }
            if (padding.right) {
                columnCount += 1;
            }
            return columnCount;
        }, [padding, _columnCount]);

        const columnWidth = useCallback((index: number) => {
            if (padding.left) {
                if (index === 0) {
                    return padding.left;
                }
                index -= 1;
            }
            if (padding.right) {
                if (index === _columnCount) {
                    return padding.right;
                }
            }
            return _columnWidth(index);
        }, [padding, _columnCount, _columnWidth]);

        const GridItem = useMemo(() => memo(
            function GridItem({ rowIndex, columnIndex, ...props }: GridChildComponentProps<void>) {
                if (padding.top) {
                    if (rowIndex === 0) {
                        return null;
                    }
                    rowIndex -= 1;
                }
                if (padding.bottom) {
                    if (rowIndex === _rowCount) {
                        return null;
                    }
                }

                if (padding.left) {
                    if (columnIndex === 0) {
                        return null;
                    }
                    columnIndex -= 1;
                }
                if (padding.right) {
                    if (columnIndex === _columnCount) {
                        return null;
                    }
                }

                return createElement(
                    _children,
                    {
                        rowIndex,
                        columnIndex,
                        ...props,
                    }
                );
            }),
            [
                padding,
                _rowCount,
                _columnCount,
                _children
            ]
        );

        const stickyRowCount = props.stickyRowCount ?? 0;
        // const stickyColumnCount = props.stickyColumnCount ?? 0;

        const InnerElement = useMemo(() => memo(
            forwardRef<HTMLDivElement, React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>>(
                function InnerElement({ style, children, ...props }, ref) {
                    if (!gridRef.current) {
                        return (
                            <div ref={ref} style={style} {...props} />
                        );
                    }

                    const stickyRowItems: ReactNode[] = [];

                    let rowStartIndex = 0;
                    if (padding.top) {
                        rowStartIndex = 1;
                    }
                    const rowStopIndex = rowStartIndex + stickyRowCount;

                    let [
                        columnStartIndex,
                        columnStopIndex,
                        // @ts-expect-error
                    ] = gridRef.current._getHorizontalRangeToRender();
                    if (padding.left && columnStartIndex === 0) {
                        columnStartIndex = 1;
                    }
                    if (padding.right && columnStopIndex === _columnCount + 1) {
                        columnStopIndex -= 1;
                    }

                    for (let rowIndex = rowStartIndex; rowIndex < rowStopIndex; rowIndex += 1) {
                        for (let columnIndex = columnStartIndex; columnIndex <= columnStopIndex; columnIndex += 1) {
                            stickyRowItems.push(
                                createElement(GridItem, {
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

                    // const stickyColumnItems: ReactNode[] = [];
                    const normalItems: ReactNode[] = [];

                    for (const child of Children.toArray(children)) {
                        if (!isValidElement(child)) {
                            continue;
                        }

                        let rowIndex = child.props.rowIndex as number;
                        if (padding.top) {
                            rowIndex -= 1;
                        }
                        if (rowIndex < stickyRowCount) {
                            continue;
                        }

                        normalItems.push(child);
                    }

                    return (
                        <div ref={ref} {...props} style={style}>
                            {normalItems}
                            <div className={styles.stickyRows}>
                                {stickyRowItems}
                            </div>
                        </div>
                    );
                }
            )
        ), [padding, _columnCount]);

        return (
            <VariableSizeGrid
                {...props}
                ref={combinedRef}
                rowCount={rowCount}
                rowHeight={rowHeight}
                columnCount={columnCount}
                columnWidth={columnWidth}
                innerElementType={InnerElement}
            >
                {GridItem}
            </VariableSizeGrid>
        );
    }
);

interface DataGridProps<T> {
    data: T[];
    columns: Column<T>[];
    rowHeight: number;
    padding?: number | number[] | undefined;
}

const DataGrid = <T extends unknown>({
    data,
    columns,
    rowHeight,
    padding: _padding
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

    const padding = useMemo(() => {
        if (typeof _padding === 'undefined') {
            return {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
            };
        } else if (typeof _padding === 'number') {
            return {
                top: _padding,
                right: _padding,
                bottom: _padding,
                left: _padding,
            };
        } else {
            switch (_padding.length) {
                case 1:
                    return {
                        top: _padding[0],
                        right: _padding[0],
                        bottom: _padding[0],
                        left: _padding[0],
                    };
                case 2:
                    return {
                        top: _padding[0],
                        right: _padding[1],
                        bottom: _padding[0],
                        left: _padding[1],
                    };
                case 3:
                    return {
                        top: _padding[0],
                        right: _padding[1],
                        bottom: _padding[2],
                        left: _padding[1],
                    };
                default:
                    return {
                        top: _padding[0],
                        right: _padding[1],
                        bottom: _padding[2],
                        left: _padding[3],
                    };
            }
        }
    }, [_padding]);

    const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 });
    const columnWidths = useMemo(() => {
        let distributableWidth = containerSize.width - padding.left - padding.right;
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
    }, [containerSize.width, padding, columns]);
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
                width={containerSize.width}
                height={containerSize.height}
                padding={_padding}
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

            <StackItem grow shrink>
                <DataGrid
                    data={toJS(globalState.logs)}
                    columns={columns}
                    rowHeight={LINE_HEIGHT}
                    padding={8}
                />
            </StackItem>
        </Stack>
    );
};

export default observer(PacketLog);
