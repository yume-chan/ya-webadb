import { makeStyles } from "@griffel/react";
import { withDisplayName } from "../utils";

const useClasses = makeStyles({
});

export interface HexViewer {
    data: Uint8Array;
}

export const HexViewer = withDisplayName('HexViewer')(({

}) => {
    const classes = useClasses();

    // Because ADB packets are usually small,
    // so don't add virtualization now.

    return (
        <div>

        </div>
    );
});
