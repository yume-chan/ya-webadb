import { makeStyles, mergeClasses } from "@griffel/react";
import { ReactNode, useMemo } from "react";
import { withDisplayName } from "../utils";

const useClasses = makeStyles({
    root: {
        width: '100%',
        height: '100%',
        overflowY: 'auto',
    },
    flex: {

        display: 'flex',
    },
    cell: {
        fontFamily: '"Cascadia Code", Consolas, monospace',
    },
    lineNumber: {
        textAlign: 'right',
    },
    hex: {
        marginLeft: '40px',
        fontVariantLigatures: 'none',
    },
});

const PRINTABLE_CHARACTERS: [number, number][] = [
    [33, 126],
    [161, 172],
    [174, 255],
];

export function isPrintableCharacter(code: number) {
    return PRINTABLE_CHARACTERS.some(
        ([start, end]) =>
            code >= start &&
            code <= end
    );
}

export function toCharacter(code: number) {
    if (isPrintableCharacter(code))
        return String.fromCharCode(code);
    return '.';
}

export function toText(data: Uint8Array) {
    let result = '';
    for (const code of data) {
        result += toCharacter(code);
    }
    return result;
}

const PER_ROW = 16;

export interface HexViewerProps {
    className?: string;
    data: Uint8Array;
}

export const HexViewer = withDisplayName('HexViewer')(({
    className,
    data
}: HexViewerProps) => {
    const classes = useClasses();

    // Because ADB packets are usually small,
    // so don't add virtualization now.

    const children = useMemo(() => {
        const lineNumbers: ReactNode[] = [];
        const hexRows: ReactNode[] = [];
        const textRows: ReactNode[] = [];
        for (let i = 0; i < data.length; i += PER_ROW) {
            lineNumbers.push(
                <div>
                    {i.toString(16)}
                </div>
            );

            let hex = '';
            for (let j = i; j < i + PER_ROW && j < data.length; j++) {
                hex += data[j].toString(16).padStart(2, '0') + ' ';
            }
            hexRows.push(
                <div>
                    {hex}
                </div>
            );

            textRows.push(
                <div>
                    {toText(data.slice(i, i + PER_ROW))}
                </div>
            );
        }

        return {
            lineNumbers,
            hexRows,
            textRows,
        };
    }, [data]);

    return (
        <div className={mergeClasses(classes.root, className)}>
            <div className={classes.flex}>
                <div className={mergeClasses(classes.cell, classes.lineNumber)}>
                    {children.lineNumbers}
                </div>
                <div className={mergeClasses(classes.cell, classes.hex)}>
                    {children.hexRows}
                </div>
                <div className={mergeClasses(classes.cell, classes.hex)}>
                    {children.textRows}
                </div>
            </div>
        </div>
    );
});
