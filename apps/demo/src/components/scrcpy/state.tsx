import { ADB_SYNC_MAX_PACKET_SIZE } from "@yume-chan/adb";
import { AdbDaemonWebUsbConnection } from "@yume-chan/adb-daemon-webusb";
import { AdbScrcpyClient, AdbScrcpyOptionsLatest } from "@yume-chan/adb-scrcpy";
import {
    Float32PcmPlayer,
    Float32PlanerPcmPlayer,
    Int16PcmPlayer,
    PcmPlayer,
} from "@yume-chan/pcm-player";
import {
    AndroidScreenPowerMode,
    CodecOptions,
    DEFAULT_SERVER_PATH,
    ScrcpyAudioCodec,
    ScrcpyDeviceMessageType,
    ScrcpyHoverHelper,
    ScrcpyInstanceId,
    ScrcpyLogLevel,
    ScrcpyMediaStreamPacket,
    ScrcpyOptionsLatest,
    ScrcpyVideoCodecId,
    clamp,
    h264ParseConfiguration,
    h265ParseConfiguration,
} from "@yume-chan/scrcpy";
import { ScrcpyVideoDecoder } from "@yume-chan/scrcpy-decoder-tinyh264";
import SCRCPY_SERVER_VERSION from "@yume-chan/scrcpy/bin/version";
import {
    Consumable,
    DistributionStream,
    InspectStream,
    ReadableStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import { action, autorun, makeAutoObservable, runInAction } from "mobx";
import { GLOBAL_STATE } from "../../state";
import { ProgressStream } from "../../utils";
import { AacDecodeStream, OpusDecodeStream } from "./audio-decode-stream";
import { fetchServer } from "./fetch-server";
import {
    AoaKeyboardInjector,
    KeyboardInjector,
    ScrcpyKeyboardInjector,
} from "./input";
import { MatroskaMuxingRecorder, RECORD_STATE } from "./recorder";
import { SETTING_STATE } from "./settings";

const NOOP = () => {
    // no-op
};

export class ScrcpyPageState {
    running = false;

    fullScreenContainer: HTMLDivElement | null = null;
    rendererContainer: HTMLDivElement | null = null;

    isFullScreen = false;

    logVisible = false;
    log: string[] = [];
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
    keyboard: KeyboardInjector | undefined = undefined;
    audioPlayer: PcmPlayer<unknown> | undefined = undefined;

    async pushServer() {
        const serverBuffer = await fetchServer();
        await AdbScrcpyClient.pushServer(
            GLOBAL_STATE.device!,
            new ReadableStream<Consumable<Uint8Array>>({
                start(controller) {
                    controller.enqueue(new Consumable(serverBuffer));
                    controller.close();
                },
            })
        );
    }

    decoder: ScrcpyVideoDecoder | undefined = undefined;
    fpsCounterIntervalId: any = undefined;
    fps = "0";

    connecting = false;
    serverTotalSize = 0;
    serverDownloadedSize = 0;
    debouncedServerDownloadedSize = 0;
    serverDownloadSpeed = 0;
    serverUploadedSize = 0;
    debouncedServerUploadedSize = 0;
    serverUploadSpeed = 0;

    constructor() {
        makeAutoObservable(this, {
            start: false,
            stop: action.bound,
            dispose: action.bound,
            setFullScreenContainer: action.bound,
            setRendererContainer: action.bound,
            clientPositionToDevicePosition: false,
        });

        autorun(() => {
            if (!GLOBAL_STATE.device) {
                this.dispose();
            }
        });

        if (typeof document === "object") {
            document.addEventListener("fullscreenchange", () => {
                if (!document.fullscreenElement) {
                    runInAction(() => {
                        this.isFullScreen = false;
                    });
                }
            });
        }

        autorun(() => {
            if (this.rendererContainer && this.decoder) {
                while (this.rendererContainer.firstChild) {
                    this.rendererContainer.firstChild.remove();
                }
                this.rendererContainer.appendChild(this.decoder.renderer);
            }
        });
    }

    start = async () => {
        if (!GLOBAL_STATE.device) {
            return;
        }

        try {
            if (!SETTING_STATE.clientSettings.decoder) {
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
                await AdbScrcpyClient.pushServer(
                    GLOBAL_STATE.device!,
                    new ReadableStream<Consumable<Uint8Array>>({
                        start(controller) {
                            controller.enqueue(new Consumable(serverBuffer));
                            controller.close();
                        },
                    })
                        // In fact `pushServer` will pipe the stream through a DistributionStream,
                        // but without this pipeThrough, the progress will not be updated.
                        .pipeThrough(
                            new DistributionStream(ADB_SYNC_MAX_PACKET_SIZE)
                        )
                        .pipeThrough(
                            new ProgressStream(
                                action((progress) => {
                                    this.serverUploadedSize = progress;
                                })
                            )
                        )
                );

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
                SETTING_STATE.decoders.find(
                    (x) => x.key === SETTING_STATE.clientSettings.decoder
                ) ?? SETTING_STATE.decoders[0];

            const videoCodecOptions = new CodecOptions();
            if (!SETTING_STATE.clientSettings.ignoreDecoderCodecArgs) {
                const capability =
                    decoderDefinition.Constructor.capabilities[
                        SETTING_STATE.settings.videoCodec!
                    ];
                if (capability) {
                    videoCodecOptions.value.profile = capability.maxProfile;
                    videoCodecOptions.value.level = capability.maxLevel;
                }
            }

            // Disabled due to https://github.com/Genymobile/scrcpy/issues/2841
            // Less recording delay
            // codecOptions.value.iFrameInterval = 1;
            // Less latency
            // codecOptions.value.intraRefreshPeriod = 10000;

            const options = new AdbScrcpyOptionsLatest(
                new ScrcpyOptionsLatest({
                    ...SETTING_STATE.settings,
                    logLevel: ScrcpyLogLevel.Debug,
                    scid: ScrcpyInstanceId.random(),
                    sendDeviceMeta: false,
                    sendDummyByte: false,
                    videoCodecOptions,
                })
            );

            runInAction(() => {
                this.log = [];
                this.log.push(
                    `[client] Server version: ${SCRCPY_SERVER_VERSION}`
                );
                this.log.push(
                    `[client] Server arguments: ${options
                        .serialize()
                        .join(" ")}`
                );
            });

            const client = await AdbScrcpyClient.start(
                GLOBAL_STATE.device!,
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

            RECORD_STATE.recorder = new MatroskaMuxingRecorder();

            client.videoStream.then(({ stream, metadata }) => {
                runInAction(() => {
                    RECORD_STATE.recorder.videoMetadata = metadata;
                });

                const decoder = new decoderDefinition.Constructor(
                    metadata.codec
                );

                runInAction(() => {
                    this.decoder = decoder;

                    let lastFrameRendered = 0;
                    let lastFrameSkipped = 0;
                    this.fpsCounterIntervalId = setInterval(
                        action(() => {
                            const deltaRendered =
                                decoder.frameRendered - lastFrameRendered;
                            const deltaSkipped =
                                decoder.frameSkipped - lastFrameSkipped;
                            // prettier-ignore
                            this.fps = `${
                            deltaRendered
                        }${
                            deltaSkipped ? `+${deltaSkipped} skipped` : ""
                        }`;
                            lastFrameRendered = decoder.frameRendered;
                            lastFrameSkipped = decoder.frameSkipped;
                        }),
                        1000
                    );
                });

                let lastKeyframe = 0n;
                const handler = new InspectStream<ScrcpyMediaStreamPacket>(
                    (packet) => {
                        RECORD_STATE.recorder.addVideoPacket(packet);

                        if (packet.type === "configuration") {
                            let croppedWidth: number;
                            let croppedHeight: number;
                            switch (metadata.codec) {
                                case ScrcpyVideoCodecId.H264:
                                    ({ croppedWidth, croppedHeight } =
                                        h264ParseConfiguration(packet.data));
                                    break;
                                case ScrcpyVideoCodecId.H265:
                                    ({ croppedWidth, croppedHeight } =
                                        h265ParseConfiguration(packet.data));
                                    break;
                                default:
                                    throw new Error("Codec not supported");
                            }

                            runInAction(() => {
                                this.log.push(
                                    `[client] Video size changed: ${croppedWidth}x${croppedHeight}`
                                );
                                this.width = croppedWidth;
                                this.height = croppedHeight;
                            });
                        } else if (
                            packet.keyframe &&
                            packet.pts !== undefined
                        ) {
                            if (lastKeyframe) {
                                const interval =
                                    (Number(packet.pts - lastKeyframe) / 1000) |
                                    0;
                                runInAction(() => {
                                    this.log.push(
                                        `[client] Keyframe interval: ${interval}ms`
                                    );
                                });
                            }
                            lastKeyframe = packet.pts!;
                        }
                    }
                );

                stream.pipeThrough(handler).pipeTo(decoder.writable);
            });

            client.audioStream?.then(async (metadata) => {
                switch (metadata.type) {
                    case "disabled":
                        runInAction(() =>
                            this.log.push(
                                `[client] Demuxer audio: stream explicitly disabled by the device`
                            )
                        );
                        return;
                    case "errored":
                        runInAction(() =>
                            this.log.push(
                                `[client] Demuxer audio: stream configuration error on the device`
                            )
                        );
                        return;
                    case "success":
                        // Code is after this `switch`
                        break;
                    default:
                        throw new Error(
                            `Unexpected audio metadata type ${
                                metadata["type"] as unknown as string
                            }`
                        );
                }

                const [recordStream, playbackStream] = metadata.stream.tee();
                switch (metadata.codec) {
                    case ScrcpyAudioCodec.RAW: {
                        const audioPlayer = new Int16PcmPlayer(48000);
                        this.audioPlayer = audioPlayer;

                        playbackStream.pipeTo(
                            new WritableStream({
                                write: (chunk) => {
                                    audioPlayer.feed(
                                        new Int16Array(
                                            chunk.data.buffer,
                                            chunk.data.byteOffset,
                                            chunk.data.byteLength /
                                                Int16Array.BYTES_PER_ELEMENT
                                        )
                                    );
                                },
                            })
                        );

                        await this.audioPlayer.start();
                        break;
                    }
                    case ScrcpyAudioCodec.OPUS: {
                        const audioPlayer = new Float32PcmPlayer(48000);
                        this.audioPlayer = audioPlayer;

                        playbackStream
                            .pipeThrough(
                                new OpusDecodeStream({
                                    codec: metadata.codec.webCodecId,
                                    numberOfChannels: 2,
                                    sampleRate: 48000,
                                })
                            )
                            .pipeTo(
                                new WritableStream({
                                    write: (chunk) => {
                                        audioPlayer.feed(chunk);
                                    },
                                })
                            );
                        await audioPlayer.start();
                        break;
                    }
                    case ScrcpyAudioCodec.AAC: {
                        const audioPlayer = new Float32PlanerPcmPlayer(48000);
                        this.audioPlayer = audioPlayer;

                        playbackStream
                            .pipeThrough(
                                new AacDecodeStream({
                                    codec: metadata.codec.webCodecId,
                                    numberOfChannels: 2,
                                    sampleRate: 48000,
                                })
                            )
                            .pipeTo(
                                new WritableStream({
                                    write: (chunk) => {
                                        audioPlayer.feed(chunk);
                                    },
                                })
                            );
                        await audioPlayer.start();
                        break;
                    }
                    default:
                        throw new Error(
                            `Unsupported audio codec ${metadata.codec.optionValue}`
                        );
                }

                runInAction(() => {
                    RECORD_STATE.recorder.audioCodec = metadata.codec;
                });

                recordStream.pipeTo(
                    new WritableStream({
                        write: (packet) => {
                            if (packet.type === "data") {
                                RECORD_STATE.recorder.addAudioPacket(packet);
                            }
                        },
                    })
                );
            });

            client.exit.then(this.dispose);

            client.deviceMessageStream!.pipeTo(
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
            );

            if (SETTING_STATE.clientSettings.turnScreenOff) {
                await client.controlMessageWriter!.setScreenPowerMode(
                    AndroidScreenPowerMode.Off
                );
            }

            runInAction(() => {
                this.client = client;
                this.hoverHelper = new ScrcpyHoverHelper();
                this.running = true;
            });

            const connection = GLOBAL_STATE.connection!;
            if (connection instanceof AdbDaemonWebUsbConnection) {
                this.keyboard = await AoaKeyboardInjector.register(
                    connection.device
                );
            } else {
                this.keyboard = new ScrcpyKeyboardInjector(client);
            }
        } catch (e: any) {
            GLOBAL_STATE.showErrorDialog(e);
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

        if (RECORD_STATE.recording) {
            RECORD_STATE.recorder.stop();
            RECORD_STATE.recording = false;
        }

        this.keyboard?.dispose();
        this.keyboard = undefined;

        this.audioPlayer?.stop();
        this.audioPlayer = undefined;

        this.fps = "0";
        clearTimeout(this.fpsCounterIntervalId);

        if (this.isFullScreen) {
            document.exitFullscreen();
            this.isFullScreen = false;
        }

        this.client = undefined;
        this.running = false;
    }

    setFullScreenContainer(element: HTMLDivElement | null) {
        this.fullScreenContainer = element;
    }

    setRendererContainer(element: HTMLDivElement | null) {
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
