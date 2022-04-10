import { mergeStyleSets, Stack, StackItem } from "@fluentui/react";
import { AdbCommand, decodeUtf8 } from "@yume-chan/adb";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { Children, CSSProperties, forwardRef, isValidElement, ReactChildren, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { VariableSizeGrid } from 'react-window';
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

interface Column {
    key: string;
    title: string;
    width?: number;
    flexGrow?: number;
    render: (value: PacketLogItem, style: CSSProperties) => JSX.Element;
}

const LINE_HEIGHT = 32;

const PacketLog: NextPage = () => {
    const styles = mergeStyleSets({
        tableContainer: {
            width: '100%',
            height: '100%',
        },
        table: {
            position: 'absolute !important',
            top: 0,
            left: 0,
        },
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

    const columns: Column[] = [
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
                    item.payloadString = decodeUtf8(item.payload);
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
    ];

    const [tableSize, setTableSize] = useState<Size>({ width: 0, height: 0 });
    const columnWidths = useMemo(() => {
        let distributableWidth = tableSize.width;
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
    }, [tableSize.width]);
    const columnWidth = useCallbackRef((index: number) => columnWidths[index]);

    const tableRef = useRef<VariableSizeGrid | null>(null);
    useEffect(() => {
        tableRef.current?.resetAfterColumnIndex(
            columns.findIndex(column => !column.width),
            true
        );
    }, [columnWidths]);

    const innerElementType = useMemo(() =>
        forwardRef<HTMLDivElement, any>(({ children, ...rest }: { children: ReactNode; }, ref) => {
            let left = 0;

            const { minColumn, maxColumn } = Children.toArray(children).reduce<{ minColumn: number; maxColumn: number; }>(
                ({ minColumn, maxColumn }, child) => {
                    if (!isValidElement(child)) {
                        return { minColumn, maxColumn };
                    }

                    const columnIndex = child.props.columnIndex as number;
                    return {
                        minColumn: Math.min(minColumn, columnIndex),
                        maxColumn: Math.max(maxColumn, columnIndex),
                    };
                },
                {
                    minColumn: Infinity,
                    maxColumn: -Infinity
                }
            );

            const headers = [];

            if (minColumn !== Infinity && maxColumn !== -Infinity) {
                for (let i = 0; i < minColumn; i += 1) {
                    left += columnWidth(i);
                }

                const height = LINE_HEIGHT;
                for (let i = minColumn; i <= maxColumn; i++) {
                    const width = columnWidth(i);
                    headers.push(
                        <div
                            key={columns[i].key}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left,
                                width,
                                height,
                            }}
                        >
                            {columns[i].title}
                        </div>
                    );
                    left += width;
                }
            }

            return (
                <div ref={ref} {...rest}>
                    <div className={styles.header}>
                        {headers}
                    </div>
                    {children}
                </div>
            );
        }),
        []
    );

    return (
        <Stack {...RouteStackProps} tokens={{}}>
            <Head>
                <title>Packet Log - Android Web Toolbox</title>
            </Head>

            <StackItem grow shrink>
                <ResizeObserver
                    className={styles.tableContainer}
                    onResize={setTableSize}
                >
                    <VariableSizeGrid
                        ref={tableRef}
                        className={styles.table}
                        width={tableSize.width}
                        height={tableSize.height}
                        columnCount={columns.length}
                        columnWidth={columnWidth}
                        rowCount={globalState.logs.length + 1}
                        rowHeight={() => LINE_HEIGHT}
                        estimatedRowHeight={LINE_HEIGHT}
                        innerElementType={innerElementType}
                    >
                        {({ columnIndex, rowIndex, style }) => {
                            if (rowIndex === 0) {
                                return null;
                            }

                            const item = globalState.logs[rowIndex - 1];
                            return columns[columnIndex].render(item, style);
                        }}
                    </VariableSizeGrid>
                </ResizeObserver>
            </StackItem>
        </Stack>
    );
};

export default observer(PacketLog);
