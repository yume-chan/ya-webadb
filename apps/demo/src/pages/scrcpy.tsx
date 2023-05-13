import {
    Dialog,
    LayerHost,
    Link,
    PrimaryButton,
    ProgressIndicator,
    Stack,
    StackItem,
} from "@fluentui/react";
import { useId } from "@fluentui/react-hooks";
import { makeStyles, shorthands } from "@griffel/react";
import { WebCodecsDecoder } from "@yume-chan/scrcpy-decoder-webcodecs";
import { action, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { KeyboardEvent, useEffect, useState } from "react";
import { DemoModePanel, DeviceView, ExternalLink } from "../components";
import {
    NavigationBar,
    SETTING_DEFINITIONS,
    SETTING_STATE,
    STATE,
    ScrcpyCommandBar,
    SettingItem,
    VideoContainer,
} from "../components/scrcpy";
import { useLocalStorage } from "../hooks";
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
                        label="Downloading scrcpy server..."
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
                        label="Pushing scrcpy server to device..."
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
                        label="Starting scrcpy server on device..."
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

const FullscreenHint = observer(function FullscreenHint({
    keyboardLockEnabled,
}: {
    keyboardLockEnabled: boolean;
}) {
    const classes = useClasses();

    const [hintHidden, setHintHidden] = useLocalStorage<`${boolean}`>(
        "scrcpy-hint-hidden",
        "false"
    );

    if (!keyboardLockEnabled || !STATE.isFullScreen || hintHidden === "true") {
        return null;
    }

    return (
        <div className={classes.fullScreenStatusBar}>
            <div>{GLOBAL_STATE.connection?.serial}</div>
            <div>FPS: {STATE.fps}</div>

            <div className={classes.spacer} />

            <div>Press and hold ESC to exit full screen</div>

            <Link onClick={() => setHintHidden("true")}>
                {`Don't show again`}
            </Link>
        </div>
    );
});

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
                <title>Scrcpy - Tango</title>
            </Head>

            {STATE.running ? (
                <>
                    <ScrcpyCommandBar />

                    <Stack horizontal grow styles={{ root: { height: 0 } }}>
                        <div
                            ref={STATE.setFullScreenContainer}
                            className={classes.fullScreenContainer}
                            tabIndex={0}
                            onKeyDown={handleKeyEvent}
                            onKeyUp={handleKeyEvent}
                        >
                            <FullscreenHint
                                keyboardLockEnabled={keyboardLockEnabled}
                            />

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

                        <DemoModePanel
                            style={{
                                display: STATE.demoModeVisible
                                    ? "block"
                                    : "none",
                            }}
                        />
                    </Stack>
                </>
            ) : (
                <>
                    <div>
                        <ExternalLink
                            href="https://github.com/Genymobile/scrcpy"
                            spaceAfter
                        >
                            Scrcpy
                        </ExternalLink>
                        can mirror device display and audio with low latency and
                        control the device, all without root access.
                    </div>
                    <div>
                        This is a TypeScript re-implementation of the client
                        part. Paired with official pre-built server binary.
                    </div>

                    <StackItem align="start">
                        <PrimaryButton
                            text="Start"
                            disabled={!GLOBAL_STATE.device}
                            onClick={STATE.start}
                        />
                    </StackItem>

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

                    <ConnectionDialog />
                </>
            )}
        </Stack>
    );
};

export default observer(Scrcpy);
