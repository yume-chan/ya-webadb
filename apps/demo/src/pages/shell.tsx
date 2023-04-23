import { Stack } from "@fluentui/react";
import { makeStyles } from "@griffel/react";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { useCallback } from "react";
import { attachTabbyFrame } from "../components";
import { RouteStackProps } from "../utils";

const useClasses = makeStyles({
    container: {
        height: "100%",
    },
});

const Shell: NextPage = (): JSX.Element | null => {
    const classes = useClasses();

    const handleContainerRef = useCallback(
        (container: HTMLDivElement | null) => {
            if (container) {
                attachTabbyFrame(container);
            }
        },
        []
    );

    return (
        <Stack {...RouteStackProps} tokens={{ childrenGap: 0, padding: 0 }}>
            <Head>
                <title>Interactive Shell - Tango</title>
            </Head>

            <div ref={handleContainerRef} className={classes.container} />
        </Stack>
    );
};

export default observer(Shell);
