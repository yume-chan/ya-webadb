import { CommandBar, Dialog, Dropdown, ICommandBarItemProps, Icon, IconButton, IDropdownOption, LayerHost, Position, ProgressIndicator, SpinButton, Stack, Toggle, TooltipHost } from "@fluentui/react";
import { useId } from "@fluentui/react-hooks";
import { action, autorun, makeAutoObservable, observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { CSSProperties, ReactNode, useEffect, useState } from "react";

import { ADB_SYNC_MAX_PACKET_SIZE, ChunkStream, InspectStream, ReadableStream, WritableStream } from '@yume-chan/adb';
import { EventEmitter } from "@yume-chan/event";
import { AndroidKeyCode, AndroidKeyEventAction, AndroidMotionEventAction, CodecOptions, DEFAULT_SERVER_PATH, pushServer, ScrcpyClient, ScrcpyLogLevel, ScrcpyOptions1_24, ScrcpyScreenOrientation, TinyH264Decoder, WebCodecsDecoder, type H264Decoder, type H264DecoderConstructor, type VideoStreamPacket } from "@yume-chan/scrcpy";
import SCRCPY_SERVER_VERSION from '@yume-chan/scrcpy/bin/version';

import { DemoModePanel, DeviceView, DeviceViewRef, ExternalLink } from "../components";
import { globalState } from "../state";
import { CommonStackTokens, formatSpeed, Icons, ProgressStream, RouteStackProps } from "../utils";

const SERVER_URL = new URL('@yume-chan/scrcpy/bin/scrcpy-server?url', import.meta.url).toString();

class FetchWithProgress {
    public readonly promise: Promise<Uint8Array>;

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
        return result;
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

function clamp(value: number, min: number, max: number): number {
    if (value < min) {
        return min;
    }

    if (value > max) {
        return max;
    }

    return value;
}

interface DecoderDefinition {
    key: string;
    name: string;
    Constructor: H264DecoderConstructor;
}

interface Settings {
    maxSize: number;
    bitRate: number;
    tunnelForward?: boolean;
    encoder?: string;
    decoder?: string;
    ignoreDecoderCodecArgs?: boolean;
}

interface SettingDefinitionBase {
    key: keyof Settings;
    type: string;
    label: string;
    description?: string;
}

interface DropdownSettingDefinition extends SettingDefinitionBase {
    type: 'dropdown';
    placeholder?: string;
    options: IDropdownOption[];
}

interface ToggleSettingDefinition extends SettingDefinitionBase {
    type: 'toggle',
}

interface NumberSettingDefinition extends SettingDefinitionBase {
    type: 'number',
    min?: number;
    max?: number;
    step?: number;
}

type SettingDefinition =
    DropdownSettingDefinition |
    ToggleSettingDefinition |
    NumberSettingDefinition;

interface SettingItemProps {
    definition: SettingDefinition;
    settings: any;
    onChange: (key: keyof Settings, value: any) => void;
}

const SettingItem = observer(function SettingItem({
    definition,
    settings,
    onChange,
}: SettingItemProps) {
    let label: string | JSX.Element;
    if (definition.description) {
        label = (
            <>
                <span>{definition.label}{' '}</span>
                <TooltipHost content={definition.description}>
                    <Icon iconName={Icons.Info} />
                </TooltipHost>
            </>
        );
    } else {
        label = definition.label;
    }

    switch (definition.type) {
        case 'dropdown':
            return (
                <Dropdown
                    label={definition.label}
                    options={definition.options}
                    placeholder={definition.placeholder}
                    selectedKey={settings[definition.key]}
                    onChange={(e, option) => onChange(definition.key, option!.key)}
                />
            );
        case 'toggle':
            return (
                <Toggle
                    label={label}
                    checked={settings[definition.key]}
                    onChange={(e, checked) => onChange(definition.key, checked)}
                />
            );
        case 'number':
            return (
                <SpinButton
                    label={definition.label}
                    labelPosition={Position.top}
                    min={definition.min}
                    max={definition.max}
                    step={definition.step}
                    value={settings[definition.key].toString()}
                    onChange={(e, value) => onChange(definition.key, Number.parseInt(value!, 10))}
                />
            );
    }
});

class ScrcpyPageState {
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

    client: ScrcpyClient | undefined = undefined;

    encoders: string[] = [];

    decoders: DecoderDefinition[] = [{
        key: 'tinyh264',
        name: 'TinyH264 (Software)',
        Constructor: TinyH264Decoder,
    }];
    decoder: H264Decoder | undefined = undefined;

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
                disabled: !globalState.device,
                iconProps: { iconName: Icons.Play },
                text: 'Start',
                onClick: this.start as VoidFunction,
            });
        } else {
            result.push({
                key: 'stop',
                iconProps: { iconName: Icons.Stop },
                text: 'Stop',
                onClick: this.stop as VoidFunction,
            });
        }

        result.push({
            key: 'fullscreen',
            disabled: !this.running,
            iconProps: { iconName: Icons.FullScreenMaximize },
            text: 'Fullscreen',
            onClick: () => { this.deviceView?.enterFullscreen(); },
        });

        return result;
    }

    get commandBarFarItems(): ICommandBarItemProps[] {
        return [
            {
                key: 'NavigationBar',
                iconProps: { iconName: Icons.PanelBottom },
                checked: this.navigationBarVisible,
                text: 'Navigation Bar',
                onClick: action(() => {
                    this.navigationBarVisible = !this.navigationBarVisible;
                }),
            },
            {
                key: 'Log',
                iconProps: { iconName: Icons.TextGrammarError },
                checked: this.logVisible,
                text: 'Log',
                onClick: action(() => {
                    this.logVisible = !this.logVisible;
                }),
            },
            {
                key: 'Settings',
                iconProps: { iconName: Icons.Settings },
                checked: this.settingsVisible,
                text: 'Settings',
                onClick: action(() => {
                    this.settingsVisible = !this.settingsVisible;
                }),
            },
            {
                key: 'DemoMode',
                iconProps: { iconName: Icons.Wand },
                checked: this.demoModeVisible,
                text: 'Demo Mode',
                onClick: action(() => {
                    this.demoModeVisible = !this.demoModeVisible;
                }),
            },
            {
                key: 'info',
                iconProps: { iconName: Icons.Info },
                iconOnly: true,
                tooltipHostProps: {
                    content: (
                        <>
                            <p>
                                <ExternalLink href="https://github.com/Genymobile/scrcpy" spaceAfter>Scrcpy</ExternalLink>
                                developed by Genymobile can display the screen with low latency (1~2 frames) and control the device, all without root access.
                            </p>
                            <p>
                                This is a TypeScript implementation of the client part. Paired with official pre-built server binary.
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

    settings: Settings = {
        maxSize: 1080,
        bitRate: 4_000_000,
    };

    get settingDefinitions() {
        const result: SettingDefinition[] = [];

        result.push({
            key: 'encoder',
            type: 'dropdown',
            label: 'Encoder',
            placeholder: 'Connect once to retrieve encoder list',
            options: this.encoders.map(item => ({
                key: item,
                text: item,
            })),
        });

        if (this.decoders.length > 1) {
            result.push({
                key: 'decoder',
                type: 'dropdown',
                label: 'Decoder',
                options: this.decoders.map(item => ({
                    key: item.key,
                    text: item.name,
                    data: item,
                })),
            });
        }

        result.push({
            key: 'ignoreDecoderCodecArgs',
            type: 'toggle',
            label: `Ignore decoder's codec arguments`,
            description: `Some decoders don't support all H.264 profile/levels, so they request the device to encode at their highest-supported codec. However, some super old devices may not support that codec so their encoders will fail to start. Use this option to let device choose the codec to be used.`,
        });

        result.push({
            key: 'maxSize',
            type: 'number',
            label: 'Max Resolution (longer side, 0 = unlimited)',
            min: 0,
            max: 2560,
            step: 50,
        });

        result.push({
            key: 'bitRate',
            type: 'number',
            label: 'Max Bit Rate',
            min: 100,
            max: 100_000_000,
            step: 100,
        });

        result.push({
            key: 'tunnelForward',
            type: 'toggle',
            label: 'Use forward connection',
            description: 'Android before version 9 has a bug that prevents reverse tunneling when using ADB over WiFi.'
        });

        return result;
    }

    constructor() {
        makeAutoObservable(this, {
            decoders: observable.shallow,
            settings: observable.deep,
            start: false,
            stop: action.bound,
            handleDeviceViewRef: action.bound,
            handleRendererContainerRef: action.bound,
            handleBackPointerDown: false,
            handleBackPointerUp: false,
            handleHomePointerDown: false,
            handleHomePointerUp: false,
            handleAppSwitchPointerDown: false,
            handleAppSwitchPointerUp: false,
            calculatePointerPosition: false,
            injectTouch: false,
            handlePointerDown: false,
            handlePointerMove: false,
            handlePointerUp: false,
            handleWheel: false,
            handleContextMenu: false,
            handleKeyDown: false,
        });

        autorun(() => {
            if (globalState.device) {
                runInAction(() => {
                    this.encoders = [];
                    this.settings.encoder = undefined;
                });
            } else {
                this.stop();
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

        if (typeof window !== 'undefined' && typeof window.VideoDecoder === 'function') {
            setTimeout(action(() => {
                this.decoders.unshift({
                    key: 'webcodecs',
                    name: 'WebCodecs',
                    Constructor: WebCodecsDecoder,
                });
            }), 0);
        }
    }

    start = async () => {
        if (!globalState.device) {
            return;
        }

        try {
            if (!this.settings.decoder) {
                throw new Error('No available decoder');
            }

            runInAction(() => {
                this.serverTotalSize = 0;
                this.serverDownloadedSize = 0;
                this.debouncedServerDownloadedSize = 0;
                this.serverUploadedSize = 0;
                this.debouncedServerUploadedSize = 0;
                this.connecting = true;
            });

            let intervalId = setInterval(action(() => {
                this.serverDownloadSpeed = this.serverDownloadedSize - this.debouncedServerDownloadedSize;
                this.debouncedServerDownloadedSize = this.serverDownloadedSize;
            }), 1000);

            let serverBuffer: Uint8Array;

            try {
                serverBuffer = await fetchServer(action(([downloaded, total]) => {
                    this.serverDownloadedSize = downloaded;
                    this.serverTotalSize = total;
                }));
                runInAction(() => {
                    this.serverDownloadSpeed = this.serverDownloadedSize - this.debouncedServerDownloadedSize;
                    this.debouncedServerDownloadedSize = this.serverDownloadedSize;
                });
            } finally {
                clearInterval(intervalId);
            }

            intervalId = setInterval(action(() => {
                this.serverUploadSpeed = this.serverUploadedSize - this.debouncedServerUploadedSize;
                this.debouncedServerUploadedSize = this.serverUploadedSize;
            }), 1000);

            try {
                await new ReadableStream<Uint8Array>({
                    start(controller) {
                        controller.enqueue(serverBuffer);
                        controller.close();
                    },
                })
                    .pipeThrough(new ChunkStream(ADB_SYNC_MAX_PACKET_SIZE))
                    .pipeThrough(new ProgressStream(action((progress) => {
                        this.serverUploadedSize = progress;
                    })))
                    .pipeTo(pushServer(globalState.device));

                runInAction(() => {
                    this.serverUploadSpeed = this.serverUploadedSize - this.debouncedServerUploadedSize;
                    this.debouncedServerUploadedSize = this.serverUploadedSize;
                });
            } finally {
                clearInterval(intervalId);
            }

            const encoders = await ScrcpyClient.getEncoders(
                globalState.device,
                DEFAULT_SERVER_PATH,
                SCRCPY_SERVER_VERSION,
                new ScrcpyOptions1_24({
                    logLevel: ScrcpyLogLevel.Debug,
                    bitRate: 4_000_000,
                    tunnelForward: this.settings.tunnelForward,
                    sendDeviceMeta: false,
                    sendDummyByte: false,
                    control: false,
                    // Don't cleanup when getting encoders,
                    // so doesn't need to push server binary again
                    cleanup: false,
                })
            );
            if (encoders.length === 0) {
                throw new Error('No available encoder found');
            }

            runInAction(() => {
                this.encoders = encoders;
            });

            const decoderDefinition = this.decoders.find(x => x.key === this.settings.decoder) ?? this.decoders[0];
            const decoder = new decoderDefinition.Constructor();
            runInAction(() => {
                this.decoder = decoder;
            });

            const options = new ScrcpyOptions1_24({
                logLevel: ScrcpyLogLevel.Debug,
                ...this.settings,
                lockVideoOrientation: ScrcpyScreenOrientation.Unlocked,
                encoderName: this.settings.encoder ?? encoders[0],
                sendDeviceMeta: false,
                sendDummyByte: false,
                codecOptions: !this.settings.ignoreDecoderCodecArgs
                    ? new CodecOptions({
                        profile: decoder.maxProfile,
                        level: decoder.maxLevel,
                    })
                    : undefined,
            });

            runInAction(() => {
                this.log = [];
                this.log.push(`[client] Server version: ${SCRCPY_SERVER_VERSION}`);
                this.log.push(`[client] Server arguments: ${options.formatServerArguments().join(' ')}`);
            });

            const client = await ScrcpyClient.start(
                globalState.device,
                DEFAULT_SERVER_PATH,
                SCRCPY_SERVER_VERSION,
                options
            );

            client.stdout.pipeTo(new WritableStream<string>({
                write: action((line) => {
                    this.log.push(line);
                }),
            }));

            client.videoStream
                .pipeThrough(new InspectStream(action((packet: VideoStreamPacket) => {
                    if (packet.type === 'configuration') {
                        const { croppedWidth, croppedHeight, } = packet.data;
                        this.log.push(`[client] Video size changed: ${croppedWidth}x${croppedHeight}`);

                        this.width = croppedWidth;
                        this.height = croppedHeight;
                    }
                })))
                .pipeTo(decoder.writable)
                .catch(() => { });

            client.exit.then(() => this.stop());

            client.onClipboardChange(content => {
                window.navigator.clipboard.writeText(content);
            });

            runInAction(() => {
                this.client = client;
                this.running = true;
            });
        } catch (e: any) {
            globalState.showErrorDialog(e);
        } finally {
            runInAction(() => {
                this.connecting = false;
            });
        }
    };

    async stop() {
        // Request to close client first
        await this.client?.close();

        // Otherwise some packets may still arrive at decoder
        this.decoder?.dispose();

        runInAction(() => {
            this.client = undefined;
            this.decoder = undefined;
            this.running = false;
        });
    }

    handleDeviceViewRef(element: DeviceViewRef | null) {
        this.deviceView = element;
    }

    handleRendererContainerRef(element: HTMLDivElement | null) {
        this.rendererContainer = element;
        this.rendererContainer?.addEventListener('wheel', this.handleWheel, { passive: false });
    };

    handleBackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!this.client) {
            return;
        }

        if (e.button !== 0) {
            return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);

        this.client.pressBackOrTurnOnScreen(AndroidKeyEventAction.Down);
    };

    handleBackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!this.client) {
            return;
        }

        if (e.button !== 0) {
            return;
        }

        this.client.pressBackOrTurnOnScreen(AndroidKeyEventAction.Up);
    };

    handleHomePointerDown = async (e: React.PointerEvent<HTMLDivElement>) => {
        if (!this.client) {
            return;
        }

        if (e.button !== 0) {
            return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);

        await this.client.injectKeyCode({
            action: AndroidKeyEventAction.Down,
            keyCode: AndroidKeyCode.Home,
            repeat: 0,
            metaState: 0,
        });
    };

    handleHomePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
        if (!this.client) {
            return;
        }

        if (e.button !== 0) {
            return;
        }

        await this.client.injectKeyCode({
            action: AndroidKeyEventAction.Up,
            keyCode: AndroidKeyCode.Home,
            repeat: 0,
            metaState: 0,
        });
    };

    handleAppSwitchPointerDown = async (e: React.PointerEvent<HTMLDivElement>) => {
        if (!this.client) {
            return;
        }

        if (e.button !== 0) {
            return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);

        await this.client.injectKeyCode({
            action: AndroidKeyEventAction.Down,
            keyCode: AndroidKeyCode.AppSwitch,
            repeat: 0,
            metaState: 0,
        });
    };

    handleAppSwitchPointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
        if (!this.client) {
            return;
        }

        if (e.button !== 0) {
            return;
        }

        await this.client.injectKeyCode({
            action: AndroidKeyEventAction.Up,
            keyCode: AndroidKeyCode.AppSwitch,
            repeat: 0,
            metaState: 0,
        });
    };

    calculatePointerPosition(clientX: number, clientY: number) {
        const view = this.rendererContainer!.getBoundingClientRect();
        const pointerViewX = clientX - view.x;
        const pointerViewY = clientY - view.y;
        const pointerScreenX = clamp(pointerViewX / view.width, 0, 1) * this.width;
        const pointerScreenY = clamp(pointerViewY / view.height, 0, 1) * this.height;

        return {
            x: pointerScreenX,
            y: pointerScreenY,
        };
    }

    injectTouch = (
        action: AndroidMotionEventAction,
        e: React.PointerEvent<HTMLDivElement>
    ) => {
        if (!this.client) {
            return;
        }

        const { x, y } = this.calculatePointerPosition(e.clientX, e.clientY);
        this.client.injectTouch({
            action,
            pointerId: e.pointerType === "mouse" ? BigInt(-1) : BigInt(e.pointerId),
            pointerX: x,
            pointerY: y,
            pressure: e.pressure * 65535,
            buttons: e.buttons,
        });
    };

    handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        this.rendererContainer!.focus();
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        this.injectTouch(AndroidMotionEventAction.Down, e);
    };

    handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        this.injectTouch(
            e.buttons === 0 ? AndroidMotionEventAction.HoverMove : AndroidMotionEventAction.Move,
            e
        );
    };

    handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        this.injectTouch(AndroidMotionEventAction.Up, e);
    };

    handleWheel = (e: WheelEvent) => {
        if (!this.client) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const { x, y } = this.calculatePointerPosition(e.clientX, e.clientY);
        this.client.injectScroll({
            pointerX: x,
            pointerY: y,
            scrollX: -Math.sign(e.deltaX),
            scrollY: -Math.sign(e.deltaY),
            buttons: 0,
        });
    };

    handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    handleKeyDown = async (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!this.client) {
            return;
        }

        const { key, code } = e;
        if (key.match(/^[a-z0-9]$/i)) {
            this.client!.injectText(key);
            return;
        }

        const keyCode = ({
            Backspace: AndroidKeyCode.Delete,
            Space: AndroidKeyCode.Space,
        } as Record<string, AndroidKeyCode | undefined>)[code];

        if (keyCode) {
            await this.client.injectKeyCode({
                action: AndroidKeyEventAction.Down,
                keyCode,
                metaState: 0,
                repeat: 0,
            });
            await this.client.injectKeyCode({
                action: AndroidKeyEventAction.Up,
                keyCode,
                metaState: 0,
                repeat: 0,
            });
        }
    };
}

const state = new ScrcpyPageState();
console.log(state);

const ConnectionDialog = observer(() => {
    const layerHostId = useId('layerHost');

    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return null;
    }

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

const NavigationBar = observer(({
    className,
    style,
    children
}: {
    className: string;
    style: CSSProperties;
    children: ReactNode;
}) => {
    if (!state.navigationBarVisible) {
        return null;
    }

    return (
        <Stack className={className} verticalFill horizontalAlign="center" style={{ height: '40px', background: '#999', ...style }}>
            {children}
            <Stack verticalFill horizontal style={{ width: '100%', maxWidth: 300 }} horizontalAlign="space-evenly" verticalAlign="center">
                <IconButton
                    iconProps={{ iconName: Icons.Play }}
                    style={{ transform: 'rotate(180deg)', color: 'white' }}
                    onPointerDown={state.handleBackPointerDown}
                    onPointerUp={state.handleBackPointerUp}
                />
                <IconButton
                    iconProps={{ iconName: Icons.Circle }}
                    style={{ color: 'white' }}
                    onPointerDown={state.handleHomePointerDown}
                    onPointerUp={state.handleHomePointerUp}
                />
                <IconButton
                    iconProps={{ iconName: Icons.Stop }}
                    style={{ color: 'white' }}
                    onPointerDown={state.handleAppSwitchPointerDown}
                    onPointerUp={state.handleAppSwitchPointerUp}
                />
            </Stack>
        </Stack>
    );
});

const Scrcpy: NextPage = () => {
    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>Scrcpy - Android Web Toolbox</title>
            </Head>

            <CommandBar items={state.commandBarItems} farItems={state.commandBarFarItems} />

            <Stack horizontal grow styles={{ root: { height: 0 } }}>
                <DeviceView
                    ref={state.handleDeviceViewRef}
                    width={state.width}
                    height={state.height}
                    BottomElement={NavigationBar}
                >
                    <div
                        ref={state.handleRendererContainerRef}
                        tabIndex={-1}
                        onPointerDown={state.handlePointerDown}
                        onPointerMove={state.handlePointerMove}
                        onPointerUp={state.handlePointerUp}
                        onPointerCancel={state.handlePointerUp}
                        onKeyDown={state.handleKeyDown}
                        onContextMenu={state.handleContextMenu}
                    />
                </DeviceView>

                <div style={{
                    padding: 12,
                    overflow: 'hidden auto',
                    display: state.logVisible ? 'block' : 'none',
                    width: 500,
                    fontFamily: 'monospace',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                }}>
                    {state.log.map((line, index) => (
                        <div key={index}>
                            {line}
                        </div>
                    ))}
                </div>

                <div style={{ padding: 12, overflow: 'hidden auto', display: state.settingsVisible ? 'block' : 'none', width: 300 }}>
                    <div>Changes will take effect on next connection</div>

                    {state.settingDefinitions.map(definition => (
                        <SettingItem
                            key={definition.key}
                            definition={definition}
                            settings={state.settings}
                            onChange={action((key, value) => (state.settings as any)[key] = value)}
                        />
                    ))}
                </div>

                <DemoModePanel
                    style={{ display: state.demoModeVisible ? 'block' : 'none' }}
                />

                <ConnectionDialog />
            </Stack>
        </Stack>
    );
};

export default observer(Scrcpy);
