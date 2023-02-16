import { Dialog, LayerHost, ProgressIndicator, Stack } from "@fluentui/react";
import { useId } from "@fluentui/react-hooks";
import { WebCodecsDecoder } from "@yume-chan/scrcpy-decoder-webcodecs";
import { action, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { useEffect, useState } from "react";
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
import { CommonStackTokens, RouteStackProps, formatSpeed } from "../utils";

const ConnectionDialog = observer(() => {
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
            <LayerHost
                id={layerHostId}
                style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    margin: 0,
                    pointerEvents: "none",
                }}
            />

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

const Scrcpy: NextPage = () => {
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

    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>Scrcpy - Android Web Toolbox</title>
            </Head>

            <ScrcpyCommandBar />

            <Stack horizontal grow styles={{ root: { height: 0 } }}>
                <DeviceView
                    ref={STATE.handleDeviceViewRef}
                    width={STATE.rotatedWidth}
                    height={STATE.rotatedHeight}
                    BottomElement={NavigationBar}
                >
                    <VideoContainer />
                </DeviceView>

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
