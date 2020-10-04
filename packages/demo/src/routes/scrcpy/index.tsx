import { Dialog, ICommandBarItemProps, ProgressIndicator, Stack, StackItem } from '@fluentui/react';
import { AdbBufferedStream, AdbStream, EventQueue } from '@yume-chan/adb';
import { Struct } from '@yume-chan/struct';
import JMuxer from 'jmuxer';
import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';
import { ErrorDialogContext } from '../../error-dialog';
import { CommonStackTokens } from '../../styles';
import { CommandBar, DeviceView, DeviceViewRef, ExternalLink, formatSpeed, useSpeed, withDisplayName } from '../../utils';
import { RouteProps } from '../type';
import { AndroidMotionEventAction, ScrcpyControlMessage, ScrcpyControlMessageType, ScrcpyInjectTouchControlMessage, ScrcpySimpleControlMessage } from './control';
import { fetchServer } from './fetch-server';

const DeviceServerPath = '/data/local/tmp/scrcpy-server.jar';

const Size =
    new Struct()
        .uint16('width')
        .uint16('height');

const VideoPacket =
    new Struct()
        .int64('pts')
        .uint32('size')
        .arrayBuffer('data', { lengthField: 'size' });

const NoPts = BigInt(-1);

async function receiveVideo(stream: AdbBufferedStream, jmuxer: JMuxer) {
    let lastPts = BigInt(0);
    let buffer: ArrayBuffer | undefined;
    try {
        while (true) {
            const { pts, data } = await VideoPacket.deserialize(stream);
            if (pts === NoPts) {
                buffer = data;
                continue;
            }

            let array: Uint8Array;
            if (buffer) {
                array = new Uint8Array(buffer.byteLength + data!.byteLength);
                array.set(new Uint8Array(buffer));
                array.set(new Uint8Array(data!), buffer.byteLength);
                buffer = undefined;
            } else {
                array = new Uint8Array(data!);
            }

            const duration = Number(pts - lastPts) / 1000;
            lastPts = pts;
            jmuxer.feed({
                video: array,
                duration,
            });
        }
    } catch (e) {
        jmuxer.destroy();
        return;
    }
}

const ClipboardMessage =
    new Struct()
        .uint32('length')
        .string('content', { lengthField: 'length' });

async function receiveControl(stream: AdbBufferedStream) {
    try {
        while (true) {
            const type = await stream.read(1);
            switch (new Uint8Array(type)[0]) {
                case 0:
                    const { content } = await ClipboardMessage.deserialize(stream);
                    window.navigator.clipboard.writeText(content!);
                    break;
                default:
                    throw new Error('unknown control message type');
            }
        }
    } catch (e) {
        return;
    }
}

async function sendControl(stream: AdbBufferedStream, queue: EventQueue<ScrcpyControlMessage>) {
    try {
        while (true) {
            const message = await queue.next();
            let buffer: ArrayBuffer;
            switch (message.type) {
                case ScrcpyControlMessageType.InjectTouch:
                    buffer = ScrcpyInjectTouchControlMessage.serialize(message, stream);
                    break;
                default:
                    buffer = ScrcpySimpleControlMessage.serialize(message, stream);
                    break;
            }
            await stream.write(buffer);
        }
    } catch (e) {
        return;
    }
}

export const enum ScrcpyLogLevel {
    Debug = 'debug',
    Info = 'info',
    Warn = 'warn',
    Error = 'error',
}

export const enum ScrcpyScreenOrientation {
    Unlocked = -1,
    Portrait = 0,
    Landscape = 1,
    PortraitFlipped = 2,
    LandscapeFlipped = 3,
}

export const Scrcpy = withDisplayName('Scrcpy')(({
    device
}: RouteProps): JSX.Element | null => {
    const { show: showErrorDialog } = useContext(ErrorDialogContext);

    const [running, setRunning] = useState(false);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const handleVideoRef = useCallback((video: HTMLVideoElement | null) => {
        videoRef.current = video;
        if (video) {
            video.onresize = () => {
                setWidth(video.videoWidth);
                setHeight(video.videoHeight);
            };

            video.addEventListener('touchstart', e => {
                e.preventDefault();
            });
            video.addEventListener('contextmenu', e => {
                e.preventDefault();
            });

            video.addEventListener('pause', () => {
                console.log('???');
                video.play();
            });
        }
    }, []);

    const [connecting, setConnecting] = useState(false);

    const [serverTotalSize, setServerTotalSize] = useState(0);

    const [serverDownloadedSize, setServerDownloadedSize] = useState(0);
    const [debouncedServerDownloadedSize, serverDownloadSpeed] = useSpeed(serverDownloadedSize, serverTotalSize);

    const [serverUploadedSize, setServerUploadedSize] = useState(0);
    const [debouncedServerUploadedSize, serverUploadSpeed] = useSpeed(serverUploadedSize, serverTotalSize);

    const serverRef = useRef<AdbStream>();
    const eventQueueRef = useRef<EventQueue<ScrcpyControlMessage>>();
    const controlStreamRef = useRef<AdbBufferedStream>();

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

                const listener = new EventQueue<AdbStream>();
                const reverseDeviceAddress = await device.reverse.add('localabstract:scrcpy', 27183, {
                    onStream(packet, stream) {
                        listener.push(stream);
                    },
                });

                const server = await device.spawn(
                    `CLASSPATH=${DeviceServerPath}`,
                    'app_process',
                    '/', // unused
                    'com.genymobile.scrcpy.Server',
                    '1.16', // SCRCPY_VERSION
                    ScrcpyLogLevel.Debug,
                    '0', // max_size (0: unlimited)
                    '8000000', // bit_rate
                    '0', // max_fps
                    ScrcpyScreenOrientation.Unlocked.toString(), // lock_video_orientation (-1: unlocked)
                    'false', // tunnel_forward
                    '-', // crop
                    'true', // always send frame meta (packet boundaries + timestamp)
                    'true', // control
                    '0', // display_id
                    'true', // show_touches
                    'true', // stay_awake
                    '-', // codec_options
                );
                server.onData(data => {
                    console.log(device.backend.decodeUtf8(data));
                });
                server.onClose(() => {
                    console.log('server stopped');
                });

                const videoStream = new AdbBufferedStream(await listener.next());
                const controlStream = new AdbBufferedStream(await listener.next());
                controlStreamRef.current = controlStream;

                // Don't await this
                // The connection might be stuck because we have not read some packets from videoStream.
                device.reverse.remove(reverseDeviceAddress);

                // Device name, we don't need it
                await videoStream.read(64);
                // Initial video size, we don't need it
                await Size.deserialize(videoStream);

                const jmuxer = new JMuxer({
                    node: videoRef.current!,
                    mode: 'video',
                    flushingTime: 0,
                });

                serverRef.current = server;

                setConnecting(false);
                setRunning(true);

                eventQueueRef.current = new EventQueue<ScrcpyControlMessage>();

                await Promise.all([
                    receiveVideo(videoStream, jmuxer),
                    receiveControl(controlStream),
                    sendControl(controlStream, eventQueueRef.current),
                ]);

                stop();
            } catch (e) {
                showErrorDialog(e.message);
            } finally {
                setConnecting(false);
            }
        })();
    }, [device]);

    const stop = useCallback(() => {
        if (!serverRef.current) {
            return;
        }

        eventQueueRef.current!.end();

        serverRef.current.close();
        serverRef.current = undefined;

        setRunning(false);
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
            key: 'info',
            iconProps: { iconName: 'Info' },
            iconOnly: true,
            tooltipHostProps: {
                content: (
                    <>
                        <div>
                            <ExternalLink href="https://github.com/Genymobile/scrcpy" spaceAfter>Scrcpy</ExternalLink>
                        developed by genymobile can display the screen with low latency (1~2 frames) and control the device, all without root access.
                        </div>
                        <div>
                            I reimplemented the protocol in JavaScript, it's used with a pre-built server binary from Genymobile's GitHub.
                        </div>
                    </>
                ),
                calloutProps: {
                    calloutMaxWidth: 300,
                }
            },
        }
    ], []);

    const injectTouch = useCallback((
        action: AndroidMotionEventAction,
        e: React.PointerEvent<HTMLVideoElement>
    ) => {
        e.preventDefault();
        e.stopPropagation();

        const view = e.currentTarget.getBoundingClientRect();
        const pointerViewX = e.clientX - view.x;
        const pointerViewY = e.clientY - view.y;
        const pointerScreenX = pointerViewX / view.width * width;
        const pointerScreenY = pointerViewY / view.height * height;

        eventQueueRef.current!.push({
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

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLVideoElement>) => {
        if (e.button !== 0) {
            return;
        }
        injectTouch(AndroidMotionEventAction.Down, e);
    }, [injectTouch]);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLVideoElement>) => {
        if (e.buttons !== 1) {
            return;
        }
        injectTouch(AndroidMotionEventAction.Move, e);
    }, [injectTouch]);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLVideoElement>) => {
        if (e.button !== 0) {
            return;
        }
        injectTouch(AndroidMotionEventAction.Up, e);
    }, [injectTouch]);

    const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLVideoElement>) => {

    }, []);

    return (
        <>
            <CommandBar items={commandBarItems} farItems={commandBarFarItems} />

            <DeviceView ref={deviceViewRef} width={width} height={height}>
                <video
                    ref={handleVideoRef}
                    autoPlay
                    width={width}
                    height={height}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onKeyPress={handleKeyPress}
                />
            </DeviceView>

            <Dialog
                hidden={!connecting}
                dialogContentProps={{
                    title: 'Connecting...'
                }}
            >
                <Stack tokens={CommonStackTokens}>
                    <StackItem>
                        <ProgressIndicator
                            label="1. Downloading scrcpy server..."
                            progressHidden={serverTotalSize === 0}
                            percentComplete={serverDownloadedSize / serverTotalSize}
                            description={formatSpeed(debouncedServerDownloadedSize, serverTotalSize, serverDownloadSpeed)}
                        />
                    </StackItem>

                    <StackItem>
                        <ProgressIndicator
                            label="2. Pushing scrcpy server to device..."
                            progressHidden={serverTotalSize === 0 || serverDownloadedSize !== serverTotalSize}
                            percentComplete={serverUploadedSize / serverTotalSize}
                            description={formatSpeed(debouncedServerUploadedSize, serverTotalSize, serverUploadSpeed)}
                        />
                    </StackItem>

                    <StackItem>
                        <ProgressIndicator
                            label="3. Starting scrcpy server on device..."
                            progressHidden={serverTotalSize === 0 || serverUploadedSize !== serverTotalSize}
                        />
                    </StackItem>
                </Stack>
            </Dialog>
        </>
    );
});
