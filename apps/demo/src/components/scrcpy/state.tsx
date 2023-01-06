import { IconButton } from "@fluentui/react";
import { ADB_SYNC_MAX_PACKET_SIZE } from "@yume-chan/adb";
import { Disposable } from "@yume-chan/event";
import {
    AdbScrcpyClient,
    AdbScrcpyOptions1_22,
    AndroidCodecLevel,
    AndroidCodecProfile,
    AndroidScreenPowerMode,
    CodecOptions,
    DEFAULT_SERVER_PATH,
    ScrcpyDeviceMessageType,
    ScrcpyHoverHelper,
    ScrcpyLogLevel,
    ScrcpyOptions1_25,
    ScrcpyVideoOrientation,
    ScrcpyVideoStreamConfigurationPacket,
    ScrcpyVideoStreamPacket,
    clamp,
} from "@yume-chan/scrcpy";
import { TinyH264Decoder } from "@yume-chan/scrcpy-decoder-tinyh264";
import SCRCPY_SERVER_VERSION from "@yume-chan/scrcpy/bin/version";
import {
    ChunkStream,
    InspectStream,
    ReadableStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import {
    action,
    autorun,
    makeAutoObservable,
    observable,
    runInAction,
} from "mobx";
import { GlobalState } from "../../state";
import { Icons, ProgressStream } from "../../utils";
import { DeviceViewRef } from "../device-view";
import { fetchServer } from "./fetch-server";
import { MuxerStream } from "./recorder";
import { SettingDefinition, Settings } from "./settings";

export interface H264Decoder extends Disposable {
    readonly maxProfile: AndroidCodecProfile | undefined;
    readonly maxLevel: AndroidCodecLevel | undefined;

    readonly renderer: HTMLElement;
    readonly frameRendered: number;
    readonly writable: WritableStream<ScrcpyVideoStreamPacket>;
}

export interface H264DecoderConstructor {
    new (): H264Decoder;
}

interface DecoderDefinition {
    key: string;
    name: string;
    Constructor: H264DecoderConstructor;
}

export const Recorder = new MuxerStream();

export class ScrcpyPageState {
    running = false;

    deviceView: DeviceViewRef | null = null;
    rendererContainer: HTMLDivElement | null = null;

    logVisible = false;
    log: string[] = [];
    settingsVisible = false;
    demoModeVisible = false;
    navigationBarVisible = true;

    width = 0;
    height = 0;
    rotation = 0;

    get rotatedWidth() {
        return STATE.rotation & 1 ? STATE.height : STATE.width;
    }
    get rotatedHeight() {
        return STATE.rotation & 1 ? STATE.width : STATE.height;
    }

    client: AdbScrcpyClient | undefined = undefined;
    hoverHelper: ScrcpyHoverHelper | undefined = undefined;

    async pushServer() {
        const serverBuffer = await fetchServer();

        await new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(serverBuffer);
                controller.close();
            },
        }).pipeTo(AdbScrcpyClient.pushServer(GlobalState.device!));
    }

    encoders: string[] = [];
    updateEncoders = async () => {
        try {
            await this.pushServer();

            const encoders = await AdbScrcpyClient.getEncoders(
                GlobalState.device!,
                DEFAULT_SERVER_PATH,
                SCRCPY_SERVER_VERSION,
                new AdbScrcpyOptions1_22(
                    new ScrcpyOptions1_25({
                        logLevel: ScrcpyLogLevel.Debug,
                        tunnelForward: this.settings.tunnelForward,
                    })
                )
            );

            runInAction(() => {
                this.encoders = encoders;
                if (
                    !this.settings.encoderName ||
                    !this.encoders.includes(this.settings.encoderName)
                ) {
                    this.settings.encoderName = this.encoders[0];
                }
            });
        } catch (e: any) {
            GlobalState.showErrorDialog(e);
        }
    };

    decoders: DecoderDefinition[] = [
        {
            key: "tinyh264",
            name: "TinyH264 (Software)",
            Constructor: TinyH264Decoder,
        },
    ];
    decoder: H264Decoder | undefined = undefined;
    configuration: ScrcpyVideoStreamConfigurationPacket | undefined = undefined;
    fpsCounterIntervalId: any = undefined;
    fps = 0;

    displays: number[] = [];
    updateDisplays = async () => {
        try {
            await this.pushServer();

            const displays = await AdbScrcpyClient.getDisplays(
                GlobalState.device!,
                DEFAULT_SERVER_PATH,
                SCRCPY_SERVER_VERSION,
                new AdbScrcpyOptions1_22(
                    new ScrcpyOptions1_25({
                        logLevel: ScrcpyLogLevel.Debug,
                        tunnelForward: this.settings.tunnelForward,
                    })
                )
            );

            runInAction(() => {
                this.displays = displays;
                if (
                    !this.settings.displayId ||
                    !this.displays.includes(this.settings.displayId)
                ) {
                    this.settings.displayId = this.displays[0];
                }
            });
        } catch (e: any) {
            GlobalState.showErrorDialog(e);
        }
    };

    connecting = false;
    serverTotalSize = 0;
    serverDownloadedSize = 0;
    debouncedServerDownloadedSize = 0;
    serverDownloadSpeed = 0;
    serverUploadedSize = 0;
    debouncedServerUploadedSize = 0;
    serverUploadSpeed = 0;

    settings: Settings = {
        maxSize: 1080,
        bitRate: 4_000_000,
        lockVideoOrientation: ScrcpyVideoOrientation.Unlocked,
        displayId: 0,
        crop: "",
        powerOn: true,
    };

    get settingDefinitions() {
        const result: SettingDefinition[] = [];

        result.push(
            {
                key: "powerOn",
                type: "toggle",
                label: "Turn device on when starting",
            },
            {
                key: "turnScreenOff",
                type: "toggle",
                label: "Turn screen off when starting",
            },
            {
                key: "stayAwake",
                type: "toggle",
                label: "Stay awake (if plugged in)",
            },
            {
                key: "powerOffOnClose",
                type: "toggle",
                label: "Turn device off when exiting",
            }
        );

        result.push({
            key: "displayId",
            type: "dropdown",
            label: "Display",
            placeholder: "Press refresh to update available displays",
            labelExtra: (
                <IconButton
                    iconProps={{ iconName: Icons.ArrowClockwise }}
                    disabled={!GlobalState.device}
                    text="Refresh"
                    onClick={this.updateDisplays}
                />
            ),
            options: this.displays.map((item) => ({
                key: item,
                text: item.toString(),
            })),
        });

        result.push({
            key: "crop",
            type: "text",
            label: "Crop",
            placeholder: "W:H:X:Y",
        });

        result.push({
            key: "maxSize",
            type: "number",
            label: "Max Resolution (longer side, 0 = unlimited)",
            min: 0,
            max: 2560,
            step: 50,
        });

        result.push({
            key: "bitRate",
            type: "number",
            label: "Max Bit Rate",
            min: 100,
            max: 100_000_000,
            step: 100,
        });

        result.push({
            key: "lockVideoOrientation",
            type: "dropdown",
            label: "Lock Video Orientation",
            options: [
                {
                    key: ScrcpyVideoOrientation.Unlocked,
                    text: "Unlocked",
                },
                {
                    key: ScrcpyVideoOrientation.Initial,
                    text: "Current",
                },
                {
                    key: ScrcpyVideoOrientation.Portrait,
                    text: "Portrait",
                },
                {
                    key: ScrcpyVideoOrientation.Landscape,
                    text: "Landscape",
                },
                {
                    key: ScrcpyVideoOrientation.PortraitFlipped,
                    text: "Portrait (Flipped)",
                },
                {
                    key: ScrcpyVideoOrientation.LandscapeFlipped,
                    text: "Landscape (Flipped)",
                },
            ],
        });

        result.push({
            key: "encoderName",
            type: "dropdown",
            label: "Encoder",
            placeholder: "Press refresh to update available encoders",
            labelExtra: (
                <IconButton
                    iconProps={{ iconName: Icons.ArrowClockwise }}
                    disabled={!GlobalState.device}
                    text="Refresh"
                    onClick={this.updateEncoders}
                />
            ),
            options: this.encoders.map((item) => ({
                key: item,
                text: item,
            })),
        });

        if (this.decoders.length > 1) {
            result.push({
                key: "decoder",
                type: "dropdown",
                label: "Decoder",
                options: this.decoders.map((item) => ({
                    key: item.key,
                    text: item.name,
                    data: item,
                })),
            });
        }

        result.push({
            key: "ignoreDecoderCodecArgs",
            type: "toggle",
            label: `Ignore decoder's codec arguments`,
            description: `Some decoders don't support all H.264 profile/levels, so they request the device to encode at their highest-supported codec. However, some super old devices may not support that codec so their encoders will fail to start. Use this option to let device choose the codec to be used.`,
        });

        result.push({
            key: "tunnelForward",
            type: "toggle",
            label: "Use forward connection",
            description:
                "Android before version 9 has a bug that prevents reverse tunneling when using ADB over WiFi.",
        });

        return result;
    }

    constructor() {
        makeAutoObservable(this, {
            decoders: observable.shallow,
            settings: observable.deep,
            start: false,
            stop: action.bound,
            dispose: action.bound,
            handleDeviceViewRef: action.bound,
            handleRendererContainerRef: action.bound,
            clientPositionToDevicePosition: false,
        });

        autorun(() => {
            if (GlobalState.device) {
                runInAction(() => {
                    this.encoders = [];
                    this.settings.encoderName = undefined;

                    this.displays = [];
                    this.settings.displayId = undefined;
                });
            } else {
                this.dispose();
            }
        });

        autorun(() => {
            if (this.rendererContainer && this.decoder) {
                while (this.rendererContainer.firstChild) {
                    this.rendererContainer.firstChild.remove();
                }
                this.rendererContainer.appendChild(this.decoder.renderer);
            }
        });

        autorun(() => {
            this.settings.decoder = this.decoders[0].key;
        });
    }

    start = async () => {
        if (!GlobalState.device) {
            return;
        }

        try {
            if (!this.settings.decoder) {
                throw new Error("No available decoder");
            }

            runInAction(() => {
                this.serverTotalSize = 0;
                this.serverDownloadedSize = 0;
                this.debouncedServerDownloadedSize = 0;
                this.serverUploadedSize = 0;
                this.debouncedServerUploadedSize = 0;
                this.connecting = true;
            });

            let intervalId = setInterval(
                action(() => {
                    this.serverDownloadSpeed =
                        this.serverDownloadedSize -
                        this.debouncedServerDownloadedSize;
                    this.debouncedServerDownloadedSize =
                        this.serverDownloadedSize;
                }),
                1000
            );

            let serverBuffer: Uint8Array;

            try {
                serverBuffer = await fetchServer(
                    action(([downloaded, total]) => {
                        this.serverDownloadedSize = downloaded;
                        this.serverTotalSize = total;
                    })
                );
                runInAction(() => {
                    this.serverDownloadSpeed =
                        this.serverDownloadedSize -
                        this.debouncedServerDownloadedSize;
                    this.debouncedServerDownloadedSize =
                        this.serverDownloadedSize;
                });
            } finally {
                clearInterval(intervalId);
            }

            intervalId = setInterval(
                action(() => {
                    this.serverUploadSpeed =
                        this.serverUploadedSize -
                        this.debouncedServerUploadedSize;
                    this.debouncedServerUploadedSize = this.serverUploadedSize;
                }),
                1000
            );

            try {
                await new ReadableStream<Uint8Array>({
                    start(controller) {
                        controller.enqueue(serverBuffer);
                        controller.close();
                    },
                })
                    .pipeThrough(new ChunkStream(ADB_SYNC_MAX_PACKET_SIZE))
                    .pipeThrough(
                        new ProgressStream(
                            action((progress) => {
                                this.serverUploadedSize = progress;
                            })
                        )
                    )
                    .pipeTo(AdbScrcpyClient.pushServer(GlobalState.device!));

                runInAction(() => {
                    this.serverUploadSpeed =
                        this.serverUploadedSize -
                        this.debouncedServerUploadedSize;
                    this.debouncedServerUploadedSize = this.serverUploadedSize;
                });
            } finally {
                clearInterval(intervalId);
            }

            const decoderDefinition =
                this.decoders.find((x) => x.key === this.settings.decoder) ??
                this.decoders[0];
            const decoder = new decoderDefinition.Constructor();

            runInAction(() => {
                this.decoder = decoder;

                let lastFrameCount = 0;
                this.fpsCounterIntervalId = setInterval(
                    action(() => {
                        this.fps = decoder.frameRendered - lastFrameCount;
                        lastFrameCount = decoder.frameRendered;
                    }),
                    1000
                );
            });

            const options = new AdbScrcpyOptions1_22(
                new ScrcpyOptions1_25({
                    logLevel: ScrcpyLogLevel.Debug,
                    ...this.settings,
                    sendDeviceMeta: false,
                    sendDummyByte: false,
                    codecOptions: !this.settings.ignoreDecoderCodecArgs
                        ? new CodecOptions({
                              profile: decoder.maxProfile,
                              level: decoder.maxLevel,
                          })
                        : undefined,
                })
            );

            runInAction(() => {
                this.log = [];
                this.log.push(
                    `[client] Server version: ${SCRCPY_SERVER_VERSION}`
                );
                this.log.push(
                    `[client] Server arguments: ${options
                        .formatServerArguments()
                        .join(" ")}`
                );
            });

            const client = await AdbScrcpyClient.start(
                GlobalState.device!,
                DEFAULT_SERVER_PATH,
                SCRCPY_SERVER_VERSION,
                options
            );

            client.stdout.pipeTo(
                new WritableStream<string>({
                    write: action((line) => {
                        this.log.push(line);
                    }),
                })
            );

            client.videoStream
                .pipeThrough(
                    new InspectStream(
                        action((packet: ScrcpyVideoStreamPacket) => {
                            if (packet.type === "configuration") {
                                const { croppedWidth, croppedHeight } =
                                    packet.data;
                                this.log.push(
                                    `[client] Video size changed: ${croppedWidth}x${croppedHeight}`
                                );

                                this.configuration = packet;
                                this.width = croppedWidth;
                                this.height = croppedHeight;
                            }
                        })
                    )
                )
                .pipeThrough(Recorder, {
                    preventAbort: true,
                    preventClose: true,
                })
                .pipeTo(decoder.writable)
                .catch(() => {});

            client.exit.then(this.dispose);

            client
                .deviceMessageStream!.pipeTo(
                    new WritableStream({
                        write(message) {
                            switch (message.type) {
                                case ScrcpyDeviceMessageType.Clipboard:
                                    window.navigator.clipboard.writeText(
                                        message.content
                                    );
                                    break;
                            }
                        },
                    })
                )
                .catch(() => {});

            if (this.settings.turnScreenOff) {
                await client.controlMessageSerializer!.setScreenPowerMode(
                    AndroidScreenPowerMode.Off
                );
            }

            runInAction(() => {
                this.client = client;
                this.hoverHelper = new ScrcpyHoverHelper();
                this.running = true;
            });
        } catch (e: any) {
            GlobalState.showErrorDialog(e);
        } finally {
            runInAction(() => {
                this.connecting = false;
            });
        }
    };

    async stop() {
        // Request to close client first
        await this.client?.close();
        this.dispose();
    }

    dispose() {
        // Otherwise some packets may still arrive at decoder
        this.decoder?.dispose();
        this.decoder = undefined;

        this.fps = 0;
        clearTimeout(this.fpsCounterIntervalId);

        this.client = undefined;
        this.running = false;
    }

    handleDeviceViewRef(element: DeviceViewRef | null) {
        this.deviceView = element;
    }

    handleRendererContainerRef(element: HTMLDivElement | null) {
        this.rendererContainer = element;
    }

    clientPositionToDevicePosition(clientX: number, clientY: number) {
        const viewRect = this.rendererContainer!.getBoundingClientRect();
        let pointerViewX = clamp((clientX - viewRect.x) / viewRect.width, 0, 1);
        let pointerViewY = clamp(
            (clientY - viewRect.y) / viewRect.height,
            0,
            1
        );

        if (this.rotation & 1) {
            [pointerViewX, pointerViewY] = [pointerViewY, pointerViewX];
        }
        switch (this.rotation) {
            case 1:
                pointerViewY = 1 - pointerViewY;
                break;
            case 2:
                pointerViewX = 1 - pointerViewX;
                pointerViewY = 1 - pointerViewY;
                break;
            case 3:
                pointerViewX = 1 - pointerViewX;
                break;
        }

        return {
            x: pointerViewX * this.width,
            y: pointerViewY * this.height,
        };
    }
}

export const STATE = new ScrcpyPageState();
