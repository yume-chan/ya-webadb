import { Dialog, ICommandBarItemProps, ProgressIndicator, Stack } from '@fluentui/react';
import { useBoolean } from '@uifabric/react-hooks';
import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';
import YUVBuffer from 'yuv-buffer';
import YUVCanvas from 'yuv-canvas';
import { CommandBar, DemoMode, DeviceView, DeviceViewRef, ErrorDialogContext, ExternalLink } from '../../components';
import { CommonStackTokens } from '../../styles';
import { formatSpeed, useSpeed, withDisplayName } from '../../utils';
import { RouteProps } from '../type';
import { AndroidCodecLevel, AndroidCodecProfile, AndroidMotionEventAction, createScrcpyConnection, fetchServer, getEncoderList, ScrcpyConnection, ScrcpyControlMessageType, ScrcpyLogLevel, ScrcpyOptions } from './server';
import { createTinyH264Decoder } from './tinyh264';

const DeviceServerPath = '/data/local/tmp/scrcpy-server.jar';

export const Scrcpy = withDisplayName('Scrcpy')(({
    device
}: RouteProps): JSX.Element | null => {
    const { show: showErrorDialog } = useContext(ErrorDialogContext);

    const [decoderReady, setDecoderReady] = useState(false);
    const [running, setRunning] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const yuvCanvasRef = useRef<YUVCanvas>();
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const handleCanvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
        canvasRef.current = canvas;
        if (canvas) {
            yuvCanvasRef.current = YUVCanvas.attach(canvas);
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
    const [debouncedServerDownloadedSize, serverDownloadSpeed] = useSpeed(serverDownloadedSize);

    const [serverUploadedSize, setServerUploadedSize] = useState(0);
    const [debouncedServerUploadedSize, serverUploadSpeed] = useSpeed(serverUploadedSize);

    const [settingsVisible, { toggle: toggleSettingsVisible }] = useBoolean(false);
    const [encoders, setEncoders] = useState<string[]>([]);
    const [currentEncoder, setCurrentEncoder] = useState<string>();

    const serverRef = useRef<ScrcpyConnection>();

    const [demoModeVisible, { toggle: toggleDemoModeVisible }] = useBoolean(false);

    const start = useCallback(() => {
        if (!device) {
            return;
        }

        (async () => {
            try {
                let croppedWidth!: number;
                let croppedHeight!: number;

                setDecoderReady(false);
                const decoder = await createTinyH264Decoder();
                decoder.pictureReady((args) => {
                    const { data, width: videoWidth, height: videoHeight } = args;

                    const format = YUVBuffer.format({
                        width: videoWidth,
                        height: videoHeight,
                        chromaWidth: videoWidth / 2,
                        chromaHeight: videoHeight / 2,
                        cropLeft: (videoWidth - croppedWidth) / 2,
                        cropTop: (videoHeight - croppedHeight) / 2,
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

                    yuvCanvasRef.current?.drawFrame(frame);
                });
                setDecoderReady(true);

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

                const options: ScrcpyOptions = {
                    device,
                    path: DeviceServerPath,
                    version: '1.16',
                    logLevel: ScrcpyLogLevel.Info,
                    bitRate: 4_000_000,
                    profile: AndroidCodecProfile.Baseline,
                    level: AndroidCodecLevel.Level4,
                };

                const encoders = await getEncoderList(options);
                if (encoders.length === 0) {
                    throw new Error('No available encoder found');
                }

                setEncoders(encoders);
                setCurrentEncoder(encoders[0]);

                let encoder;
                for (let item of encoders) {
                    // This one is known not working
                    if (item === 'OMX.hisi.video.encoder.avc') {
                        continue;
                    }

                    encoder = item;
                    break;
                }

                options.encoder = encoder;

                const server = await createScrcpyConnection(options);

                server.onInfo(message => {
                    console.log('INFO: ' + message);
                });
                server.onError(message => {
                    showErrorDialog(message);
                });
                server.onClose(stop);

                server.onSizeChanged(() => {
                    croppedWidth = server.width!;
                    croppedHeight = server.height!;
                    setWidth(croppedWidth);
                    setHeight(croppedHeight);
                });
                server.onVideoData(({ data }) => {
                    decoder.feed(data!);
                });

                server.onClipboardChange(content => {
                    window.navigator.clipboard.writeText(content);
                });

                serverRef.current = server;

                setConnecting(false);
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
            if (!serverRef.current) {
                return;
            }

            await serverRef.current.close();
            serverRef.current = undefined;

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
        // {
        //     key: 'Settings',
        //     iconProps: { iconName: 'Settings' },
        //     checked: settingsVisible,
        //     text: 'Settings',
        //     onClick: toggleSettingsVisible,
        // },
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
        e.preventDefault();
        e.stopPropagation();

        const view = e.currentTarget.getBoundingClientRect();
        const pointerViewX = e.clientX - view.x;
        const pointerViewY = e.clientY - view.y;
        const pointerScreenX = pointerViewX / view.width * width;
        const pointerScreenY = pointerViewY / view.height * height;

        serverRef.current?.injectTouch({
            type: ScrcpyControlMessageType.InjectTouch,
            action,
            buttons: 0,
            pointerId: BigInt(e.pointerId),
            pointerX: pointerScreenX,
            pointerY: pointerScreenY,
            pressure: e.pressure * 65535,
            screenWidth: width,
            screenHeight: height,
        });
    }, [width, height]);

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.button !== 0) {
            return;
        }
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
        injectTouch(AndroidMotionEventAction.Up, e);
    }, [injectTouch]);

    const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {

    }, []);

    return (
        <>
            <CommandBar items={commandBarItems} farItems={commandBarFarItems} />

            <Stack horizontal grow styles={{ root: { height: 0 } }}>
                <DeviceView ref={deviceViewRef} width={width} height={height}>
                    <canvas
                        ref={handleCanvasRef}
                        width={width}
                        height={height}
                        style={{ display: 'block' }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onKeyPress={handleKeyPress}
                    />
                    {/* {width && (
                    <Stack horizontal style={{ width, height: 150, background: '#999' }} horizontalAlign="space-evenly" verticalAlign="center">
                        <IconButton iconProps={{ iconName: 'Play' }} style={{ transform: 'rotate(180deg)', color: 'white' }} />
                        <IconButton iconProps={{ iconName: 'LocationCircle' }} style={{ color: 'white' }} />
                        <IconButton iconProps={{ iconName: 'Stop' }} style={{ color: 'white' }} />
                    </Stack>
                )} */}
                </DeviceView>

                {/* <div style={{ padding: 12, overflow: 'hidden auto', display: settingsVisible ? 'block' : 'none' }}>
                    <PrimaryButton text="Apply and Restart" />

                    <Dropdown
                        label="Encoder"
                        options={encoders.map(item => ({ key: item, text: item }))}
                        selectedKey={currentEncoder}
                    />

                    <NumberPicker
                        label="Target Bit Rate"
                        labelPosition={Position.top}
                        value={2_000_000}
                        min={100}
                        max={10_000_000}
                        step={100}
                        onChange={() => { }}
                    />
                </div> */}

                <DemoMode
                    device={device}
                    style={{ display: demoModeVisible ? 'block' : 'none' }}
                />
            </Stack>

            <Dialog
                hidden={!connecting}
                dialogContentProps={{
                    title: 'Connecting...'
                }}
            >
                <Stack tokens={CommonStackTokens}>
                    <ProgressIndicator
                        label="1. Initializing video decoder..."
                        percentComplete={decoderReady ? 1 : undefined}
                    />

                    <ProgressIndicator
                        label="2. Downloading scrcpy server..."
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
