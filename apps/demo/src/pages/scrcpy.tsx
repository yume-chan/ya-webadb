import { Dialog, LayerHost, ProgressIndicator, Stack } from "@fluentui/react";
import { useId } from "@fluentui/react-hooks";
import { makeStyles, shorthands } from "@griffel/react";
import { WebCodecsDecoder } from "@yume-chan/scrcpy-decoder-webcodecs";
import { action, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { KeyboardEvent, useEffect, useState } from "react";
import { DemoModePanel, DeviceView } from "../components";
import {
    NavigationBar,
    SETTING_DEFINITIONS,
    SETTING_STATE,
    STATE,
    ScrcpyCommandBar,
    SettingItem,
    VideoContainer,
} from "../components/scrcpy";
import { GLOBAL_STATE } from "../state";
import { CommonStackTokens, RouteStackProps, formatSpeed } from "../utils";

const useClasses = makeStyles({
    layerHost: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        pointerEvents: "none",
        ...shorthands.margin(0),
    },
    fullScreenContainer: {
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "black",
        ":focus-visible": {
            ...shorthands.outline("0"),
        },
    },
    fullScreenStatusBar: {
        display: "flex",
        color: "white",
        columnGap: "12px",
        ...shorthands.padding("8px", "20px"),
    },
    spacer: {
        flexGrow: 1,
    },
});

const ConnectionDialog = observer(() => {
    const classes = useClasses();
    const layerHostId = useId("layerHost");

    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return null;
    }

    return (
        <>
            <LayerHost id={layerHostId} className={classes.layerHost} />

            <Dialog
                hidden={!STATE.connecting}
                modalProps={{ layerProps: { hostId: layerHostId } }}
                dialogContentProps={{ title: "Connecting..." }}
            >
                <Stack tokens={CommonStackTokens}>
                    <ProgressIndicator
                        label="1. Downloading scrcpy server..."
                        percentComplete={
                            STATE.serverTotalSize
                                ? STATE.serverDownloadedSize /
                                  STATE.serverTotalSize
                                : undefined
                        }
                        description={formatSpeed(
                            STATE.debouncedServerDownloadedSize,
                            STATE.serverTotalSize,
                            STATE.serverDownloadSpeed
                        )}
                    />

                    <ProgressIndicator
                        label="2. Pushing scrcpy server to device..."
                        progressHidden={
                            STATE.serverTotalSize === 0 ||
                            STATE.serverDownloadedSize !== STATE.serverTotalSize
                        }
                        percentComplete={
                            STATE.serverUploadedSize / STATE.serverTotalSize
                        }
                        description={formatSpeed(
                            STATE.debouncedServerUploadedSize,
                            STATE.serverTotalSize,
                            STATE.serverUploadSpeed
                        )}
                    />

                    <ProgressIndicator
                        label="3. Starting scrcpy server on device..."
                        progressHidden={
                            STATE.serverTotalSize === 0 ||
                            STATE.serverUploadedSize !== STATE.serverTotalSize
                        }
                    />
                </Stack>
            </Dialog>
        </>
    );
});

async function handleKeyEvent(e: KeyboardEvent<HTMLDivElement>) {
    if (!STATE.client) {
        return;
    }

    e.preventDefault();
    e.stopPropagation();

    const { type, code } = e;
    STATE.keyboard![type === "keydown" ? "down" : "up"](code);
}

function handleBlur() {
    if (!STATE.client) {
        return;
    }

    STATE.keyboard?.reset();
}

const Scrcpy: NextPage = () => {
    const classes = useClasses();

    useEffect(() => {
        // Detect WebCodecs support at client side
        if (
            SETTING_STATE.decoders.length === 1 &&
            typeof window.VideoDecoder === "function"
        ) {
            runInAction(() => {
                SETTING_STATE.decoders.unshift({
                    key: "webcodecs",
                    name: "WebCodecs",
                    Constructor: WebCodecsDecoder,
                });
            });
        }
    }, []);

    const [keyboardLockEnabled, setKeyboardLockEnabled] = useState(false);
    useEffect(() => {
        if (!("keyboard" in navigator)) {
            return;
        }

        // Keyboard Lock is only effective in fullscreen mode,
        // but the `lock` method can be called at any time.

        // @ts-expect-error
        navigator.keyboard.lock();
        setKeyboardLockEnabled(true);

        return () => {
            // @ts-expect-error
            navigator.keyboard.unlock();
        };
    }, []);

    useEffect(() => {
        window.addEventListener("blur", handleBlur);

        return () => {
            window.removeEventListener("blur", handleBlur);
        };
    }, []);

    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>Scrcpy - Android Web Toolbox</title>
            </Head>

            <ScrcpyCommandBar />

            <Stack horizontal grow styles={{ root: { height: 0 } }}>
                <div
                    ref={STATE.setFullScreenContainer}
                    className={classes.fullScreenContainer}
                    tabIndex={0}
                    onKeyDown={handleKeyEvent}
                    onKeyUp={handleKeyEvent}
                >
                    {keyboardLockEnabled && STATE.isFullScreen && (
                        <div className={classes.fullScreenStatusBar}>
                            <div>{GLOBAL_STATE.backend?.serial}</div>
                            <div>FPS: {STATE.fps}</div>

                            <div className={classes.spacer} />

                            <div>Press and hold ESC to exit full screen</div>
                        </div>
                    )}
                    <DeviceView
                        width={STATE.rotatedWidth}
                        height={STATE.rotatedHeight}
                        BottomElement={NavigationBar}
                    >
                        <VideoContainer />
                    </DeviceView>
                </div>

                <div
                    style={{
                        padding: 12,
                        overflow: "hidden auto",
                        display: STATE.logVisible ? "block" : "none",
                        width: 500,
                        fontFamily: "monospace",
                        overflowY: "auto",
                        whiteSpace: "pre-wrap",
                        wordWrap: "break-word",
                    }}
                >
                    {STATE.log.map((line, index) => (
                        <div key={index}>{line}</div>
                    ))}
                </div>

                <div
                    style={{
                        padding: 12,
                        overflow: "hidden auto",
                        display: SETTING_STATE.settingsVisible
                            ? "block"
                            : "none",
                        width: 300,
                    }}
                >
                    <div>Changes will take effect on next connection</div>

                    {SETTING_DEFINITIONS.get().map((definition) => (
                        <SettingItem
                            key={definition.key}
                            definition={definition}
                            value={
                                (SETTING_STATE[definition.group] as any)[
                                    definition.key
                                ]
                            }
                            onChange={action(
                                (definition, value) =>
                                    ((SETTING_STATE[definition.group] as any)[
                                        definition.key
                                    ] = value)
                            )}
                        />
                    ))}
                </div>

                <DemoModePanel
                    style={{
                        display: STATE.demoModeVisible ? "block" : "none",
                    }}
                />

                <ConnectionDialog />
            </Stack>
        </Stack>
    );
};

export default observer(Scrcpy);
