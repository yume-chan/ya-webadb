import { ICommandBarItemProps } from '@fluentui/react';
import { AdbBufferedStream, AdbStream, EventQueue } from '@yume-chan/adb';
import { Struct } from '@yume-chan/struct';
import serverUrl from 'file-loader!./scrcpy-server';
import JMuxer from 'jmuxer';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { CommandBar, DeviceView, ExternalLink, withDisplayName } from '../../utils';
import { RouteProps } from '../type';

let cachedServerBinary: Promise<ArrayBuffer> | undefined;
function getServerBinary() {
    if (!cachedServerBinary) {
        cachedServerBinary = fetch(serverUrl).then(response => response.arrayBuffer());
    }
    return cachedServerBinary;
}

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

export const Scrcpy = withDisplayName('Scrcpy', ({
    device
}: RouteProps): JSX.Element | null => {
    const [running, setRunning] = useState(false);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const handleVideoRef = useCallback((value: HTMLVideoElement | null) => {
        videoRef.current = value;
        if (value) {
            value.onresize = () => {
                setWidth(value.videoWidth);
                setHeight(value.videoHeight);
            };
        }
    }, []);

    const serverRef = useRef<AdbStream | undefined>();
    const controlStreamRef = useRef<AdbBufferedStream | undefined>();

    const start = useCallback(() => {
        if (!device) {
            return;
        }

        (async () => {
            const serverBuffer = await getServerBinary();

            const sync = await device.sync();
            await sync.write(DeviceServerPath, serverBuffer);

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
            setRunning(true);

            await Promise.all([
                receiveVideo(videoStream, jmuxer),
                receiveControl(controlStream),
            ]);

            jmuxer.destroy();
            await server.close();
            serverRef.current = undefined;
            setRunning(false);
        })();
    }, [device]);

    const stop = useCallback(() => {
        serverRef.current!.close();
    }, []);

    const commandBarItems = useMemo((): ICommandBarItemProps[] => {
        if (running) {
            return [{
                key: 'stop',
                iconProps: { iconName: 'Stop' },
                text: 'Stop',
                onClick: stop,
            }];
        } else {
            return [{
                key: 'start',
                disabled: !device,
                iconProps: { iconName: 'Play' },
                text: 'Start',
                onClick: start,
            }];
        }
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

    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLVideoElement>) => {
        controlStreamRef.current!.write(new ArrayBuffer(10));
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLVideoElement>) => {

    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLVideoElement>) => {

    }, []);

    const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLVideoElement>) => {

    }, []);

    const handleCanPlay = useCallback(() => {
        videoRef.current!.play();
    }, []);

    return (
        <>
            <CommandBar items={commandBarItems} farItems={commandBarFarItems} />
            <DeviceView width={width} height={height}>
                <video
                    ref={handleVideoRef}
                    width={width}
                    height={height}
                    onCanPlay={handleCanPlay}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onKeyPress={handleKeyPress}
                />
            </DeviceView>
        </>
    );
});
