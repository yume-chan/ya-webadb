import { CommandBar, Dialog, Dropdown, ICommandBarItemProps, Icon, IconButton, IDropdownOption, LayerHost, Position, ProgressIndicator, SpinButton, Stack, Toggle, TooltipHost } from "@fluentui/react";
import { useId } from "@fluentui/react-hooks";
import { EventEmitter } from "@yume-chan/event";
import { AndroidKeyCode, DEFAULT_SERVER_PATH, H264Decoder, H264DecoderConstructor, pushServer, ScrcpyClient, ScrcpyLogLevel, ScrcpyOptions1_19, ScrcpyScreenOrientation, TinyH264Decoder, WebCodecsDecoder } from "@yume-chan/scrcpy";
import { action, autorun, makeAutoObservable, observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import React from "react";
import { DemoMode, DeviceView, DeviceViewRef, ExternalLink } from "../components";
import { global } from "../state";
import { CommonStackTokens, formatSpeed, RouteStackProps } from "../utils";

const SERVER_URL = new URL('@yume-chan/scrcpy/bin/scrcpy-server?url', import.meta.url).toString();
console.log('SERVER_URL', SERVER_URL);

export const ScrcpyServerVersion = '1.19';

class FetchWithProgress {
    public readonly promise: Promise<ArrayBuffer>;

    private _downloaded = 0;
    public get downloaded() { return this._downloaded; }

    private _total = 0;
    public get total() { return this._total; }

    private progressEvent = new EventEmitter<[download: number, total: number]>();
    public get onProgress() { return this.progressEvent.event; }

    public constructor(url: string) {
        this.promise = this.fetch(url);
    }

    private async fetch(url: string) {
        const response = await window.fetch(url);
        this._total = Number.parseInt(response.headers.get('Content-Length') ?? '0', 10);
        this.progressEvent.fire([this._downloaded, this._total]);

        const reader = response.body!.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
            const result = await reader.read();
            if (result.done) {
                break;
            }
            chunks.push(result.value);
            this._downloaded += result.value.byteLength;
            this.progressEvent.fire([this._downloaded, this._total]);
        }

        this._total = chunks.reduce((result, item) => result + item.byteLength, 0);
        const result = new Uint8Array(this._total);
        let position = 0;
        for (const chunk of chunks) {
            result.set(chunk, position);
            position += chunk.byteLength;
        }
        return result.buffer;
    }
}

let cachedValue: FetchWithProgress | undefined;
function fetchServer(onProgress?: (e: [downloaded: number, total: number]) => void) {
    if (!cachedValue) {
        cachedValue = new FetchWithProgress(SERVER_URL);
        cachedValue.promise.catch((e) => {
            cachedValue = undefined;
        });
    }

    if (onProgress) {
        cachedValue.onProgress(onProgress);
        onProgress([cachedValue.downloaded, cachedValue.total]);
    }

    return cachedValue.promise;
}

const DECODERS: { name: string; factory: H264DecoderConstructor; }[] = [];

if (typeof window !== 'undefined' && typeof window.VideoDecoder === 'function') {
    DECODERS.push({
        name: 'WebCodecs',
        factory: WebCodecsDecoder,
    });
}

DECODERS.push({
    name: 'TinyH264 (Software)',
    factory: TinyH264Decoder,
});

class ScrcpyPageState {
    running = false;
    deviceView: DeviceViewRef | null = null;
    rendererContainer: HTMLDivElement | null = null;
    settingsVisible = false;
    demoModeVisible = false;
    width = 0;
    height = 0;
    client: ScrcpyClient | undefined;
    decoder: H264Decoder | undefined;
    encoders: string[] = [];
    selectedEncoder: string | undefined;
    selectedDecoder: { name: string, factory: H264DecoderConstructor; } = DECODERS[0];
    resolution = 1080;
    bitRate = 4_000_000;
    tunnelForward = false;
    connecting = false;
    serverTotalSize = 0;
    serverDownloadedSize = 0;
    debouncedServerDownloadedSize = 0;
    serverDownloadSpeed = 0;
    serverUploadedSize = 0;
    debouncedServerUploadedSize = 0;
    serverUploadSpeed = 0;

    get commandBarItems() {
        const result: ICommandBarItemProps[] = [];

        if (!this.running) {
            result.push({
                key: 'start',
                disabled: !global.device,
                iconProps: { iconName: 'Play' },
                text: 'Start',
                onClick: this.start as VoidFunction,
            });
        } else {
            result.push({
                key: 'stop',
                iconProps: { iconName: 'Stop' },
                text: 'Stop',
                onClick: this.stop,
            });
        }

        result.push({
            key: 'fullscreen',
            disabled: !this.running,
            iconProps: { iconName: 'Fullscreen' },
            text: 'Fullscreen',
            onClick: () => { this.deviceView?.enterFullscreen(); },
        });

        return result;
    }

    get commandBarFarItems() {
        return [
            {
                key: 'Settings',
                iconProps: { iconName: 'Settings' },
                checked: this.settingsVisible,
                text: 'Settings',
                onClick: action(() => {
                    this.settingsVisible = !this.settingsVisible;
                }),
            },
            {
                key: 'DemoMode',
                iconProps: { iconName: 'Personalize' },
                checked: this.demoModeVisible,
                text: 'Demo Mode Settings',
                onClick: action(() => {
                    this.demoModeVisible = !this.demoModeVisible;
                }),
            },
            {
                key: 'info',
                iconProps: { iconName: 'Info' },
                iconOnly: true,
                tooltipHostProps: {
                    content: (
                        <>
                            <p>
                                <ExternalLink href="https://github.com/Genymobile/scrcpy" spaceAfter>Scrcpy</ExternalLink>
                                developed by Genymobile can display the screen with low latency (1~2 frames) and control the device, all without root access.
                            </p>
                            <p>
                                I reimplemented the protocol in JavaScript, a pre-built server binary from Genymobile is used.
                            </p>
                            <p>
                                It uses tinyh264 as decoder to achieve low latency. But since it's a software decoder, high CPU usage and sub-optimal compatibility are expected.
                            </p>
                        </>
                    ),
                    calloutProps: {
                        calloutMaxWidth: 300,
                    }
                },
            }
        ];
    }

    constructor() {
        makeAutoObservable(this, {
            selectedDecoder: observable.ref,
            start: false,
            stop: action.bound,
            handleDeviceViewRef: action.bound,
            handleRendererContainerRef: action.bound,
            handleBackClick: false,
            handleHomeClick: false,
            handleAppSwitchClick: false,
            handleCurrentEncoderChange: action.bound,
            handleSelectedDecoderChange: action.bound,
            handleResolutionChange: action.bound,
            handleTunnelForwardChange: action.bound,
        });

        autorun(() => {
            if (global.device) {
                runInAction(() => {
                    this.encoders = [];
                    this.selectedEncoder = undefined;
                });
            }
        });

        autorun(() => {
            if (this.rendererContainer && this.decoder) {
                while (this.rendererContainer.firstChild) {
                    this.rendererContainer.firstChild.remove();
                }
                this.rendererContainer.appendChild(this.decoder.element);
            }
        });
    }

    start = async () => {
        if (!global.device) {
            return;
        }

        try {
            if (!state.selectedDecoder) {
                throw new Error('No available decoder');
            }

            runInAction(() => {
                this.serverTotalSize = 0;
                this.serverDownloadedSize = 0;
                this.serverUploadedSize = 0;
                this.connecting = true;
            });

            const serverBuffer = await fetchServer(action(([downloaded, total]) => {
                this.serverDownloadedSize = downloaded;
                this.serverTotalSize = total;
            }));

            await pushServer(global.device, serverBuffer, {
                onProgress: action((progress) => {
                    this.serverUploadedSize = progress;
                }),
            });

            console.log(1);

            const encoders = await ScrcpyClient.getEncoders(
                global.device,
                new ScrcpyOptions1_19({
                    version: ScrcpyServerVersion,
                    logLevel: ScrcpyLogLevel.Debug,
                    bitRate: 4_000_000,
                    tunnelForward: this.tunnelForward,
                })
            );
            if (encoders.length === 0) {
                throw new Error('No available encoder found');
            }

            runInAction(() => {
                this.encoders = encoders;
            });

            // Run scrcpy once will delete the server file
            // Re-push it
            await pushServer(global.device, serverBuffer);

            const factory = this.selectedDecoder.factory;
            const decoder = new factory();
            runInAction(() => {
                this.decoder = decoder;
            });

            const client = new ScrcpyClient(global.device);

            client.onDebug(message => {
                console.debug('[server] ' + message);
            });
            client.onInfo(message => {
                console.log('[server] ' + message);
            });
            client.onError(({ message }) => {
                global.showErrorDialog(message);
            });
            client.onClose(stop);

            client.onSizeChanged(action((size) => {
                const { croppedWidth, croppedHeight, } = size;

                this.width = croppedWidth;
                this.height = croppedHeight;

                decoder.setSize(size);
            }));

            client.onVideoData(({ data }) => {
                decoder.feed(data);
            });

            client.onClipboardChange(content => {
                window.navigator.clipboard.writeText(content);
            });

            await client.start(
                new ScrcpyOptions1_19({
                    version: ScrcpyServerVersion,
                    logLevel: ScrcpyLogLevel.Debug,
                    maxSize: this.resolution,
                    bitRate: this.bitRate,
                    orientation: ScrcpyScreenOrientation.Unlocked,
                    tunnelForward: this.tunnelForward,
                    encoder: this.selectedEncoder ?? encoders[0],
                    profile: decoder.maxProfile,
                    level: decoder.maxLevel,
                })
            );

            runInAction(() => {
                this.client = client;
                this.running = true;
            });
        } catch (e: any) {
            global.showErrorDialog(e.message);
        } finally {
            runInAction(() => {
                this.connecting = false;
            });
        }
    };

    stop() {
        this.client?.close();
        this.client = undefined;
        this.decoder?.dispose();
        this.decoder = undefined;
        this.running = false;
    }

    handleDeviceViewRef(element: DeviceViewRef | null) {
        this.deviceView = element;
    }

    handleRendererContainerRef(element: HTMLDivElement | null) {
        this.rendererContainer = element;
    };

    handleBackClick = () => {
        this.client!.pressBackOrTurnOnScreen();
    };

    handleHomeClick = () => {
        this.client!.injectKeyCode({
            keyCode: AndroidKeyCode.Home,
            repeat: 0,
            metaState: 0,
        });
    };

    handleAppSwitchClick = () => {
        this.client!.injectKeyCode({
            keyCode: AndroidKeyCode.AppSwitch,
            repeat: 0,
            metaState: 0,
        });
    };

    handleCurrentEncoderChange(e?: any, option?: IDropdownOption) {
        if (!option) {
            return;
        }

        this.selectedEncoder = option.text;
    }

    handleSelectedDecoderChange(e?: any, option?: IDropdownOption) {
        if (!option) {
            return;
        }

        this.selectedDecoder = option.data;
    }

    handleResolutionChange(e: any, value?: string) {
        if (value === undefined) {
            return;
        }
        this.resolution = +value;
    }

    handleBitRateChange(e: any, value?: string) {
        if (value === undefined) {
            return;
        }
        this.bitRate = +value;
    }

    handleTunnelForwardChange(event: React.MouseEvent<HTMLElement>, checked?: boolean) {
        if (checked === undefined) {
            return;
        }

        this.tunnelForward = checked;
    };
}

const state = new ScrcpyPageState();

const ConnectionDialog = observer(() => {
    const layerHostId = useId('layerHost');

    return (
        <>
            <LayerHost id={layerHostId} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, margin: 0, pointerEvents: 'none' }} />

            <Dialog
                hidden={!state.connecting}
                modalProps={{ layerProps: { hostId: layerHostId } }}
                dialogContentProps={{ title: 'Connecting...' }}
            >
                <Stack tokens={CommonStackTokens}>
                    <ProgressIndicator
                        label="1. Downloading scrcpy server..."
                        percentComplete={state.serverTotalSize ? state.serverDownloadedSize / state.serverTotalSize : undefined}
                        description={formatSpeed(state.debouncedServerDownloadedSize, state.serverTotalSize, state.serverDownloadSpeed)}
                    />

                    <ProgressIndicator
                        label="2. Pushing scrcpy server to device..."
                        progressHidden={state.serverTotalSize === 0 || state.serverDownloadedSize !== state.serverTotalSize}
                        percentComplete={state.serverUploadedSize / state.serverTotalSize}
                        description={formatSpeed(state.debouncedServerUploadedSize, state.serverTotalSize, state.serverUploadSpeed)}
                    />

                    <ProgressIndicator
                        label="3. Starting scrcpy server on device..."
                        progressHidden={state.serverTotalSize === 0 || state.serverUploadedSize !== state.serverTotalSize}
                    />
                </Stack>
            </Dialog>
        </>
    );
});

const Scrcpy: NextPage = () => {
    const layerHostId = useId('layerHost');

    const bottomElement = (
        <Stack verticalFill horizontalAlign="center" style={{ background: '#999' }}>
            <Stack verticalFill horizontal style={{ width: '100%', maxWidth: 300 }} horizontalAlign="space-evenly" verticalAlign="center">
                <IconButton
                    iconProps={{ iconName: 'Play' }}
                    style={{ transform: 'rotate(180deg)', color: 'white' }}
                    onClick={state.handleBackClick}
                />
                <IconButton
                    iconProps={{ iconName: 'LocationCircle' }}
                    style={{ color: 'white' }}
                    onClick={state.handleHomeClick}
                />
                <IconButton
                    iconProps={{ iconName: 'Stop' }}
                    style={{ color: 'white' }}
                    onClick={state.handleAppSwitchClick}
                />
            </Stack>
        </Stack>
    );

    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>Scrcpy - WebADB</title>
            </Head>

            <CommandBar items={state.commandBarItems} farItems={state.commandBarFarItems} />

            <Stack horizontal grow styles={{ root: { height: 0 } }}>
                <DeviceView
                    ref={state.handleDeviceViewRef}
                    width={state.width}
                    height={state.height}
                    bottomElement={bottomElement}
                    bottomHeight={40}
                >
                    <div ref={state.handleRendererContainerRef} />
                </DeviceView>

                <div style={{ padding: 12, overflow: 'hidden auto', display: state.settingsVisible ? 'block' : 'none', width: 300 }}>
                    <div>Changes will take effect on next connection</div>

                    <Dropdown
                        label="Encoder"
                        options={state.encoders.map(item => ({ key: item, text: item }))}
                        selectedKey={state.selectedEncoder}
                        placeholder="Connect once to retrieve encoder list"
                        onChange={state.handleCurrentEncoderChange}
                    />

                    {DECODERS.length > 1 && (
                        <Dropdown
                            label="Decoder"
                            options={DECODERS.map(item => ({ key: item.name, text: item.name, data: item }))}
                            selectedKey={state.selectedDecoder.name}
                            onChange={state.handleSelectedDecoderChange}
                        />
                    )}

                    <SpinButton
                        label="Max Resolution (longer side, 0 = unlimited)"
                        labelPosition={Position.top}
                        value={state.resolution.toString()}
                        min={0}
                        max={2560}
                        step={100}
                        onChange={state.handleResolutionChange}
                    />

                    <SpinButton
                        label="Max Bit Rate"
                        labelPosition={Position.top}
                        value={state.bitRate.toString()}
                        min={100}
                        max={10_000_000}
                        step={100}
                        onChange={state.handleBitRateChange}
                    />

                    <Toggle
                        label={
                            <>
                                <span>Use forward connection{' '}</span>
                                <TooltipHost content="Old Android devices may not support reverse connection when using ADB over WiFi">
                                    <Icon iconName="Info" />
                                </TooltipHost>
                            </>
                        }
                        checked={state.tunnelForward}
                        onChange={state.handleTunnelForwardChange}
                    />
                </div>

                <DemoMode
                    style={{ display: state.demoModeVisible ? 'block' : 'none' }}
                />

                <ConnectionDialog />
            </Stack>
        </Stack>
    );
};

export default observer(Scrcpy);
