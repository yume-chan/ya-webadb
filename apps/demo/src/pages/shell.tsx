import { makeStyles } from "@griffel/react";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { useCallback } from "react";
import { attachTabbyFrame } from "../components";

const useClasses = makeStyles({
    container: {
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
});

const Shell: NextPage = (): JSX.Element | null => {
    const classes = useClasses();

    const handleContainerRef = useCallback(
        (container: HTMLDivElement | null) => {
            // invoke it with `null` to hide the iframe
            attachTabbyFrame(container);
        },
        []
    );

    return (
        <>
            <Head>
                <title>Interactive Shell - Tango</title>
            </Head>

            <div ref={handleContainerRef} className={classes.container}>
                <div>Loading Tabby...</div>
            </div>
        </>
    );
};

export default observer(Shell);
