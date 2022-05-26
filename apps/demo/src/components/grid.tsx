import { makeStyles, mergeClasses, shorthands } from '@griffel/react';
import { ComponentType, CSSProperties, useEffect, useMemo, useState } from "react";
import { useStableCallback, withDisplayName } from "../utils";
import { ResizeObserver, Size } from './resize-observer';

const useClasses = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.overflow('hidden'),
    },
    header: {
        position: 'relative',
    },
    body: {
        position: 'relative',
        flexGrow: 1,
        height: 0,
        ...shorthands.overflow('auto'),
    },
    placeholder: {
        // make horizontal scrollbar visible
        minHeight: '1px',
    },
    row: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        willChange: 'transform',
    },
    cell: {
        position: 'absolute',
        top: 0,
        left: 0,
        willChange: 'transform',
    },
});

export interface GridCellProps {
    className: string;
    style: CSSProperties;
    rowIndex: number;
    columnIndex: number;
}

export interface GridCellWrapperProps {
    CellComponent: ComponentType<GridCellProps>;
    rowIndex: number;
    rowHeight: number;
    columnIndex: number;
    columnWidth: number;
    columnOffset: number;
}

const GridCellWrapper = withDisplayName('GridCellWrapper')(({
    CellComponent,
    rowIndex,
    rowHeight,
    columnIndex,
    columnWidth,
    columnOffset,
}: GridCellWrapperProps) => {
    const classes = useClasses();

    const styles = useMemo(() => ({
        width: columnWidth,
        height: rowHeight,
        transform: `translateX(${columnOffset}px)`,
    }), [rowHeight, columnWidth, columnOffset]);

    return (
        <CellComponent
            className={classes.cell}
            style={styles}
            rowIndex={rowIndex}
            columnIndex={columnIndex}
        />
    );
});

export interface GridRowProps {
    className: string;
    style: CSSProperties;
    rowIndex: number;
    children: React.ReactNode;
}

export interface GridColumn {
    width: number;
    minWidth?: number;
    maxWidth?: number;
    flexGrow?: number;
    flexShrink?: number;
    CellComponent: ComponentType<GridCellProps>;
}

interface GridRowWrapperProps {
    RowComponent: ComponentType<GridRowProps>;
    rowIndex: number;
    rowHeight: number;
    columns: (GridColumn & { offset: number; })[];
}

const GridRowWrapper = withDisplayName('GridRowWrapper')(({
    RowComponent,
    rowIndex,
    rowHeight,
    columns,
}: GridRowWrapperProps) => {
    const classes = useClasses();

    const styles = useMemo(() => ({
        height: rowHeight,
        transform: `translateY(${rowIndex * rowHeight}px)`,
    }), [rowIndex, rowHeight]);

    return (
        <RowComponent
            className={classes.row}
            style={styles}
            rowIndex={rowIndex}
        >
            {columns.map((column, columnIndex) => (
                <GridCellWrapper
                    key={columnIndex}
                    rowIndex={rowIndex}
                    rowHeight={rowHeight}
                    columnIndex={columnIndex}
                    columnWidth={column.width}
                    columnOffset={column.offset}
                    CellComponent={column.CellComponent}
                />
            ))}
        </RowComponent>
    );
});

export interface GridHeaderProps {
    className: string;
    columnIndex: number;
    style: CSSProperties;
}

export interface GridProps {
    className?: string;
    rowCount: number;
    rowHeight: number;
    columns: GridColumn[];
    HeaderComponent: ComponentType<GridHeaderProps>;
    RowComponent: ComponentType<GridRowProps>;
}

export const Grid = withDisplayName('Grid')(({
    className,
    rowCount,
    rowHeight,
    columns,
    HeaderComponent,
    RowComponent,
}: GridProps) => {
    const classes = useClasses();

    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    const [bodyRef, setBodyRef] = useState<HTMLDivElement | null>(null);
    const [bodySize, setBodySize] = useState<Size>({ width: 0, height: 0 });

    const [autoScroll, setAutoScroll] = useState(true);

    const handleScroll = useStableCallback(() => {
        if (bodyRef) {
            if (autoScroll) {
                if (scrollTop < bodyRef.scrollHeight - bodyRef.clientHeight && bodyRef.scrollTop < scrollTop) {
                    setAutoScroll(false);
                }
            } else if (bodyRef.scrollTop + bodyRef.offsetHeight >= bodyRef.scrollHeight - 50) {
                setAutoScroll(true);
            }

            setScrollLeft(bodyRef.scrollLeft);
            setScrollTop(bodyRef.scrollTop);
        }
    });

    useEffect(() => {
        if (bodyRef) {
            setScrollLeft(bodyRef.scrollLeft);
            setScrollTop(bodyRef.scrollTop);
        }
    }, [bodyRef]);

    const rowRange = useMemo(() => {
        const start = Math.min(rowCount, Math.floor(scrollTop / rowHeight));
        const end = Math.min(rowCount, Math.ceil((scrollTop + bodySize.height) / rowHeight));
        return { start, end, offset: scrollTop - start * rowHeight };
    }, [scrollTop, bodySize.height, rowCount, rowHeight]);

    const columnMetadata = useMemo(() => {
        if (bodySize.width === 0) {
            return {
                columns: [],
                totalWidth: 0,
            };
        }

        const result = [];
        let requestedWidth = 0;
        let columnsCanGrow = [];
        let totalFlexGrow = 0;
        let columnsCanShrink = [];
        let totalFlexShrink = 0;
        for (const column of columns) {
            const copy = { ...column, offset: 0 };
            result.push(copy);

            requestedWidth += copy.width;

            if (copy.flexGrow !== undefined) {
                columnsCanGrow.push(copy);
                totalFlexGrow += copy.flexGrow;
            }

            if (copy.flexShrink !== 0) {
                if (copy.flexShrink === undefined) {
                    copy.flexShrink = 1;
                }
                if (copy.minWidth === undefined) {
                    copy.minWidth = 0;
                }
                columnsCanShrink.push(copy);
                totalFlexShrink += copy.flexShrink;
            }
        }

        let extraWidth = bodySize.width - requestedWidth;
        while (extraWidth > 1 && columnsCanGrow.length > 0) {
            const growPerRatio = extraWidth / totalFlexGrow;
            columnsCanGrow = columnsCanGrow.filter(column => {
                let canGrowFurther = true;
                const initialWidth = column.width;
                column.width += column.flexGrow! * growPerRatio;
                if (column.maxWidth !== undefined && column.width > column.maxWidth) {
                    column.width = column.maxWidth;
                    canGrowFurther = false;
                }
                extraWidth -= (column.width - initialWidth);
                return canGrowFurther;
            });
        }

        while (extraWidth < -1 && columnsCanShrink.length > 0) {
            const shrinkPerRatio = -extraWidth / totalFlexShrink;
            columnsCanShrink = columnsCanShrink.filter(column => {
                let canShrinkFurther = true;
                const initialWidth = column.width;
                column.width -= column.flexShrink! * shrinkPerRatio;
                if (column.width < column.minWidth!) {
                    column.width = column.minWidth!;
                    canShrinkFurther = false;
                }
                extraWidth += (initialWidth - column.width);
                return canShrinkFurther;
            });
        }

        let offset = 0;
        for (const column of result) {
            column.offset = offset;
            offset += column.width;
        }

        return {
            columns: result,
            totalWidth: offset,
        };
    }, [columns, bodySize.width]);

    useEffect(() => {
        if (autoScroll && bodyRef) {
            void bodyRef.offsetLeft;
            bodyRef.scrollTop = bodyRef.scrollHeight;
        }
    });

    const headers = useMemo(() => (
        columnMetadata.columns.map((column, index) => (
            <HeaderComponent
                key={index}
                columnIndex={index}
                className={classes.cell}
                style={{
                    width: column.width,
                    height: rowHeight,
                    transform: `translateX(${column.offset}px)`,
                }}
            />
        ))
    ), [columnMetadata, HeaderComponent, classes, rowHeight]);

    const headerStyle = useMemo(() => ({
        height: rowHeight,
        transform: `translateX(-${scrollLeft}px)`,
    }), [rowHeight, scrollLeft]);

    const placeholder = useMemo(() => (
        <div
            className={classes.placeholder}
            style={{ width: columnMetadata.totalWidth, height: rowCount * rowHeight }}
        />
    ), [classes, columnMetadata, rowCount, rowHeight]);

    return (
        <div className={mergeClasses(classes.container, className)}>
            <div className={classes.header} style={headerStyle}>
                {headers}
            </div>
            <div ref={setBodyRef} className={classes.body} onScroll={handleScroll}>
                <ResizeObserver onResize={setBodySize} />
                {placeholder}
                {Array.from(
                    { length: rowRange.end - rowRange.start },
                    (_, rowIndex) => (
                        <GridRowWrapper
                            key={rowRange.start + rowIndex}
                            RowComponent={RowComponent}
                            rowIndex={rowRange.start + rowIndex}
                            rowHeight={rowHeight}
                            columns={columnMetadata.columns}
                        />
                    )
                )}
            </div>
        </div>
    );
});
