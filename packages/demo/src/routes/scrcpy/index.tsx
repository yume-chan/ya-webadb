import { Dialog, Dropdown, ICommandBarItemProps, Icon, IconButton, IDropdownOption, LayerHost, Position, ProgressIndicator, Stack, Toggle, TooltipHost } from '@fluentui/react';
import { useBoolean, useId } from '@uifabric/react-hooks';
import React, { FormEvent, KeyboardEvent, useCallback, useContext, useMemo, useRef, useState } from 'react';
import YUVBuffer from 'yuv-buffer';
import YUVCanvas from 'yuv-canvas';
import { CommandBar, DemoMode, DeviceView, DeviceViewRef, ErrorDialogContext, ExternalLink, NumberPicker } from '../../components';
import { CommonStackTokens } from '../../styles';
import { formatSpeed, useSpeed, withDisplayName } from '../../utils';
import { RouteProps } from '../type';
import { AndroidCodecLevel, AndroidCodecProfile, AndroidKeyCode, AndroidMotionEventAction, fetchServer, ScrcpyClient, ScrcpyLogLevel, ScrcpyScreenOrientation, ScrcpyClientOptions, ScrcpyServerVersion } from './server';
import { createTinyH264Decoder, TinyH264Decoder } from './tinyh264';

const DeviceServerPath = '/data/local/tmp/scrcpy-server.jar';

function clamp(value: number, min: number, max: number): number {
    if (value < min) {
        return min;
    }

    if (value > max) {
        return max;
    }

    return value;
}

export const Scrcpy = withDisplayName('Scrcpy')(({
    device
}: RouteProps): JSX.Element | null => {
    const { show: showErrorDialog } = useContext(ErrorDialogContext);

    const [running, setRunning] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const handleCanvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
        canvasRef.current = canvas;
        if (canvas) {
            canvas.addEventListener('touchstart', e => {
                e.preventDefault();
            });
            canvas.addEventListener('contextmenu', e => {
                e.preventDefault();
            });
        }
    }, []);

    const [connecting, setConnecting] = useState(false);

    const [serverTotalSize, setServerTotalSize] = useState(0);

    const [serverDownloadedSize, setServerDownloadedSize] = useState(0);
    const [debouncedServerDownloadedSize, serverDownloadSpeed] = useSpeed(serverDownloadedSize, serverTotalSize);

    const [serverUploadedSize, setServerUploadedSize] = useState(0);
    const [debouncedServerUploadedSize, serverUploadSpeed] = useSpeed(serverUploadedSize, serverTotalSize);

    const [settingsVisible, { toggle: toggleSettingsVisible }] = useBoolean(false);

    const [encoders, setEncoders] = useState<string[]>([]);
    const [currentEncoder, setCurrentEncoder] = useState<string>();
    const handleCurrentEncoderChange = useCallback((e?: FormEvent<HTMLElement>, option?: IDropdownOption) => {
        if (!option) {
            return;
        }

        setCurrentEncoder(option.key as string);
    }, []);

    const [bitRate, setBitRate] = useState(4_000_000);

    const [tunnelForward, setTunnelForward] = useState(false);
    const handleTunnelForwardChange = useCallback((event: React.MouseEvent<HTMLElement>, checked?: boolean) => {
        if (checked === undefined) {
            return;
        }

        setTunnelForward(checked);
    }, []);

    const scrcpyClientRef = useRef<ScrcpyClient>();

    const [demoModeVisible, { toggle: toggleDemoModeVisible }] = useBoolean(false);

    const start = useCallback(() => {
        if (!device) {
            return;
        }

        (async () => {
            try {
                setServerTotalSize(0);
                setServerDownloadedSize(0);
                setServerUploadedSize(0);
                setConnecting(true);

                const serverBuffer = await fetchServer(([downloaded, total]) => {
                    setServerDownloadedSize(downloaded);
                    setServerTotalSize(total);
                });

                const sync = await device.sync();
                await sync.write(
                    DeviceServerPath,
                    serverBuffer,
                    undefined,
                    undefined,
                    setServerUploadedSize
                );

                const encoders = await ScrcpyClient.getEncoders({
                    device,
                    path: DeviceServerPath,
                    version: ScrcpyServerVersion,
                    logLevel: ScrcpyLogLevel.Debug,
                    bitRate: 4_000_000,
                });
                if (encoders.length === 0) {
                    throw new Error('No available encoder found');
                }
                setEncoders(encoders);

                // Run scrcpy once will delete the server file
                // Re-push it
                await sync.write(
                    DeviceServerPath,
                    serverBuffer,
                );

                const options: ScrcpyClientOptions = {
                    device,
                    path: DeviceServerPath,
                    version: ScrcpyServerVersion,
                    logLevel: ScrcpyLogLevel.Debug,
                    // TinyH264 is slow, so limit the max resolution and bit rate
                    maxSize: 1080,
                    bitRate: 4_000_000,
                    orientation: ScrcpyScreenOrientation.Unlocked,
                    // TinyH264 only supports Baseline profile
                    profile: AndroidCodecProfile.Baseline,
                    level: AndroidCodecLevel.Level4,
                };

                let encoder!: string;
                setCurrentEncoder(current => {
                    if (current) {
                        encoder = current;
                        return current;
                    } else {
                        encoder = encoders.find(item => item !== '') ?? 'OMX.hisi.video.encoder.avc';
                        return encoder;
                    }
                });
                options.encoder = encoder;

                let bitRate!: number;
                setBitRate(current => {
                    bitRate = current;
                    return current;
                });
                options.bitRate = bitRate;

                let tunnelForward!: boolean;
                setTunnelForward(current => {
                    tunnelForward = current;
                    return current;
                });
                options.tunnelForward = tunnelForward;

                const client = new ScrcpyClient(options);

                client.onDebug(message => {
                    console.debug('[server] ' + message);
                });
                client.onInfo(message => {
                    console.log('[server] ' + message);
                });
                client.onError(({ message }) => {
                    showErrorDialog(message);
                });
                client.onClose(stop);

                let decoderPromise: Promise<TinyH264Decoder> | undefined;
                client.onSizeChanged(async ({ croppedWidth, croppedHeight, cropLeft, cropTop }) => {
                    let oldDecoderPromise = decoderPromise;
                    decoderPromise = createTinyH264Decoder();

                    let decoder = await oldDecoderPromise;
                    decoder?.dispose();

                    if (canvasRef.current) {
                        canvasRef.current.width = croppedWidth;
                        canvasRef.current.height = croppedHeight;
                    }

                    setWidth(croppedWidth);
                    setHeight(croppedHeight);

                    const yuvCanvas = YUVCanvas.attach(canvasRef.current!);

                    decoder = await decoderPromise;
                    decoder.pictureReady((args) => {
                        const { data, width: videoWidth, height: videoHeight } = args;

                        const format = YUVBuffer.format({
                            width: videoWidth,
                            height: videoHeight,
                            chromaWidth: videoWidth / 2,
                            chromaHeight: videoHeight / 2,
                            cropLeft,
                            cropTop,
                            cropWidth: croppedWidth,
                            cropHeight: croppedHeight,
                            displayWidth: croppedWidth,
                            displayHeight: croppedHeight,
                        });

                        const array = new Uint8Array(data);
                        const frame = YUVBuffer.frame(format,
                            YUVBuffer.lumaPlane(format, array, videoWidth, 0),
                            YUVBuffer.chromaPlane(format, array, videoWidth / 2, videoWidth * videoHeight),
                            YUVBuffer.chromaPlane(format, array, videoWidth / 2, videoWidth * videoHeight + videoWidth * videoHeight / 4)
                        );

                        yuvCanvas.drawFrame(frame);
                    });
                });
                client.onVideoData(async ({ data }) => {
                    let decoder = await decoderPromise;
                    decoder?.feed(data!);
                });

                client.onClipboardChange(content => {
                    window.navigator.clipboard.writeText(content);
                });

                await client.start();
                scrcpyClientRef.current = client;
                setRunning(true);
            } catch (e) {
                showErrorDialog(e.message);
            } finally {
                setConnecting(false);
            }
        })();
    }, [device]);

    const stop = useCallback(() => {
        (async () => {
            if (!scrcpyClientRef.current) {
                return;
            }

            await scrcpyClientRef.current.close();
            scrcpyClientRef.current = undefined;

            setRunning(false);
        })();
    }, []);

    const deviceViewRef = useRef<DeviceViewRef | null>(null);
    const commandBarItems = useMemo((): ICommandBarItemProps[] => {
        const result: ICommandBarItemProps[] = [];

        if (running) {
            result.push({
                key: 'stop',
                iconProps: { iconName: 'Stop' },
                text: 'Stop',
                onClick: stop,
            });
        } else {
            result.push({
                key: 'start',
                disabled: !device,
                iconProps: { iconName: 'Play' },
                text: 'Start',
                onClick: start,
            });
        }

        result.push({
            key: 'fullscreen',
            disabled: !running,
            iconProps: { iconName: 'Fullscreen' },
            text: 'Fullscreen',
            onClick: () => { deviceViewRef.current?.enterFullscreen(); },
        });

        return result;
    }, [device, running, start]);

    const commandBarFarItems = useMemo((): ICommandBarItemProps[] => [
        {
            key: 'Settings',
            iconProps: { iconName: 'Settings' },
            checked: settingsVisible,
            text: 'Settings',
            onClick: toggleSettingsVisible,
        },
        {
            key: 'DemoMode',
            iconProps: { iconName: 'Personalize' },
            checked: demoModeVisible,
            text: 'Demo Mode Settings',
            onClick: toggleDemoModeVisible,
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
    ], [settingsVisible, demoModeVisible]);

    const injectTouch = useCallback((
        action: AndroidMotionEventAction,
        e: React.PointerEvent<HTMLCanvasElement>
    ) => {
        const view = canvasRef.current!.getBoundingClientRect();
        const pointerViewX = e.clientX - view.x;
        const pointerViewY = e.clientY - view.y;
        const pointerScreenX = clamp(pointerViewX / view.width, 0, 1) * width;
        const pointerScreenY = clamp(pointerViewY / view.height, 0, 1) * height;

        scrcpyClientRef.current?.injectTouch({
            action,
            pointerId: BigInt(e.pointerId),
            pointerX: pointerScreenX,
            pointerY: pointerScreenY,
            pressure: e.pressure * 65535,
            buttons: 0,
        });
    }, [width, height]);

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.button !== 0) {
            return;
        }
        canvasRef.current!.focus();
        e.currentTarget.setPointerCapture(e.pointerId);
        injectTouch(AndroidMotionEventAction.Down, e);
    }, [injectTouch]);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.buttons !== 1) {
            return;
        }
        injectTouch(AndroidMotionEventAction.Move, e);
    }, [injectTouch]);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.button !== 0) {
            return;
        }
        e.currentTarget.releasePointerCapture(e.pointerId);
        injectTouch(AndroidMotionEventAction.Up, e);
    }, [injectTouch]);

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLCanvasElement>) => {
        const key = e.key;
        if (key.match(/^[a-z0-9]$/i)) {
            scrcpyClientRef.current!.injectText(key);
            return;
        }

        const keyCode = ({
            Backspace: AndroidKeyCode.Delete,
        } as Record<string, AndroidKeyCode | undefined>)[key];
        if (keyCode) {
            scrcpyClientRef.current!.injectKeyCode({
                keyCode,
                metaState: 0,
                repeat: 0,
            });
        }
    }, []);

    const handleBackClick = useCallback(() => {
        scrcpyClientRef.current!.pressBackOrTurnOnScreen();
    }, []);

    const handleHomeClick = useCallback(() => {
        scrcpyClientRef.current!.injectKeyCode({
            keyCode: AndroidKeyCode.Home,
            repeat: 0,
            metaState: 0,
        });
    }, []);

    const handleAppSwitchClick = useCallback(() => {
        scrcpyClientRef.current!.injectKeyCode({
            keyCode: AndroidKeyCode.AppSwitch,
            repeat: 0,
            metaState: 0,
        });
    }, []);

    const bottomElement = (
        <Stack verticalFill horizontalAlign="center" style={{ background: '#999' }}>
            <Stack verticalFill horizontal style={{ width: '100%', maxWidth: 300 }} horizontalAlign="space-evenly" verticalAlign="center">
                <IconButton
                    iconProps={{ iconName: 'Play' }}
                    style={{ transform: 'rotate(180deg)', color: 'white' }}
                    onClick={handleBackClick}
                />
                <IconButton
                    iconProps={{ iconName: 'LocationCircle' }}
                    style={{ color: 'white' }}
                    onClick={handleHomeClick}
                />
                <IconButton
                    iconProps={{ iconName: 'Stop' }}
                    style={{ color: 'white' }}
                    onClick={handleAppSwitchClick}
                />
            </Stack>
        </Stack>
    );

    const layerHostId = useId('layerHost');

    return (
        <>
            <CommandBar items={commandBarItems} farItems={commandBarFarItems} />

            <Stack horizontal grow styles={{ root: { height: 0 } }}>
                <DeviceView
                    ref={deviceViewRef}
                    width={width}
                    height={height}
                    bottomElement={bottomElement}
                    bottomHeight={40}
                >
                    <canvas
                        ref={handleCanvasRef}
                        style={{ display: 'block', outline: 'none' }}
                        tabIndex={-1}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        onKeyDown={handleKeyDown}
                    />
                </DeviceView>

                <div style={{ padding: 12, overflow: 'hidden auto', display: settingsVisible ? 'block' : 'none', width: 300 }}>
                    <div>Changes will take effect on next connection</div>

                    <Dropdown
                        label="Encoder"
                        options={encoders.map(item => ({ key: item, text: item }))}
                        selectedKey={currentEncoder}
                        placeholder="Connect once to retrieve encoder list"
                        onChange={handleCurrentEncoderChange}
                    />

                    <NumberPicker
                        label="Target Bit Rate"
                        labelPosition={Position.top}
                        value={bitRate}
                        min={100}
                        max={10_000_000}
                        step={100}
                        onChange={setBitRate}
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
                        checked={tunnelForward}
                        onChange={handleTunnelForwardChange}
                    />
                </div>

                <DemoMode
                    device={device}
                    style={{ display: demoModeVisible ? 'block' : 'none' }}
                />
            </Stack>

            {connecting && <LayerHost id={layerHostId} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, margin: 0 }} />}

            <Dialog
                hidden={!connecting}
                modalProps={{ layerProps: { hostId: layerHostId } }}
                dialogContentProps={{
                    title: 'Connecting...'
                }}
            >
                <Stack tokens={CommonStackTokens}>
                    <ProgressIndicator
                        label="1. Downloading scrcpy server..."
                        percentComplete={serverTotalSize ? serverDownloadedSize / serverTotalSize : undefined}
                        description={formatSpeed(debouncedServerDownloadedSize, serverTotalSize, serverDownloadSpeed)}
                    />

                    <ProgressIndicator
                        label="2. Pushing scrcpy server to device..."
                        progressHidden={serverTotalSize === 0 || serverDownloadedSize !== serverTotalSize}
                        percentComplete={serverUploadedSize / serverTotalSize}
                        description={formatSpeed(debouncedServerUploadedSize, serverTotalSize, serverUploadSpeed)}
                    />

                    <ProgressIndicator
                        label="3. Starting scrcpy server on device..."
                        progressHidden={serverTotalSize === 0 || serverUploadedSize !== serverTotalSize}
                    />
                </Stack>
            </Dialog>
        </>
    );
});
