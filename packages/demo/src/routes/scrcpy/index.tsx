import { PrimaryButton, Stack, StackItem } from '@fluentui/react';
import { AdbBufferedStream, AdbStream, EventQueue } from '@yume-chan/adb';
import { Struct } from '@yume-chan/struct';
import serverUrl from 'file-loader!./scrcpy-server';
import JMuxer from 'jmuxer';
import React, { useCallback, useRef, useState } from 'react';
import { ResizeObserver, withDisplayName } from '../../utils';
import { RouteProps } from '../type';

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
    while (true) {
        const { pts, data } = await VideoPacket.deserialize(stream);

        let duration: number | undefined;
        if (pts !== NoPts) {
            duration = Number(pts - lastPts) / 1000;
            lastPts = pts;
        }

        jmuxer.feed({
            video: new Uint8Array(data!),
            duration,
        });
    }
}

const ClipboardMessage =
    new Struct()
        .uint32('length')
        .string('content', { lengthField: 'length' });

async function receiveControl(stream: AdbBufferedStream) {
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
    const [videoWidth, setVideoWidth] = useState(0);
    const [videoHeight, setVideoHeight] = useState(0);
    const [scale, setScale] = useState(1);

    const controlStreamRef = useRef<AdbBufferedStream | undefined>();

    const start = useCallback(async () => {
        if (!device) {
            return;
        }

        const serverBuffer = await fetch(serverUrl).then(response => response.arrayBuffer());

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

        device.reverse.remove(reverseDeviceAddress);

        // device name, we have already knew it from adb
        await videoStream.read(64);

        const { width, height } = await Size.deserialize(videoStream);
        setVideoWidth(width);
        setVideoHeight(height);

        const jmuxer = new JMuxer({
            node: videoRef.current!,
            mode: 'video',
            flushingTime: 0,
        });

        await Promise.all([
            receiveVideo(videoStream, jmuxer),
            receiveControl(controlStream),
        ]);

        jmuxer.destroy();
        await server.close();
    }, [device]);

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

    const handleResize = useCallback((width: number, height: number) => {
        if (videoWidth === 0) {
            setScale(1);
            return;
        }

        const videoRatio = videoWidth / videoHeight;
        const containerRatio = width / height;
        if (videoRatio > containerRatio) {
            setScale(width / videoWidth);
        } else {
            setScale(height / videoHeight);
        }
    }, [videoWidth, videoHeight]);

    return (
        <>
            <StackItem>
                <Stack horizontal>
                    <PrimaryButton
                        text="Start"
                        disabled={!device}
                        onClick={start}
                    />
                </Stack>
            </StackItem>
            <StackItem grow>
                <ResizeObserver
                    style={{ position: 'relative', width: '100%', height: '100%' }}
                    onResize={handleResize}
                >
                    <video
                        ref={videoRef}
                        width={videoWidth}
                        height={videoHeight}
                        style={{ position: 'absolute', transform: `scale(${scale})`, transformOrigin: 'top left' }}
                        onCanPlay={handleCanPlay}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onKeyPress={handleKeyPress}
                    />
                </ResizeObserver>
            </StackItem>
        </>
    );
});
