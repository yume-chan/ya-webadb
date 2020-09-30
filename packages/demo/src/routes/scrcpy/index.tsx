import { PrimaryButton } from '@fluentui/react';
import { AdbBufferedStream, AdbStream, EventQueue } from '@yume-chan/adb';
import { Struct } from '@yume-chan/struct';
import serverUrl from 'file-loader!./scrcpy-server';
import React, { useCallback, useRef, useState } from 'react';
import { withDisplayName } from '../../utils';
import { RouteProps } from '../type';

const DeviceServerPath = '/data/local/tmp/scrcpy-server.jar';

const Size =
    new Struct({ littleEndian: true })
        .uint16('width')
        .uint16('height');

const VideoPacket =
    new Struct()
        .uint64('pts')
        .uint32('size')
        .arrayBuffer('data', { lengthField: 'size' });

async function receiveVideo(stream: AdbBufferedStream) {
    while (true) {
        await VideoPacket.deserialize(stream);
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

export const Scrcpy = withDisplayName('Scrcpy', ({
    device
}: RouteProps): JSX.Element | null => {
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [scale, setScale] = useState(1);

    const controlStreamRef = useRef<AdbBufferedStream | undefined>();

    const connect = useCallback(async () => {
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
            'error', // log_level
            '0', // max_size (0: unlimited)
            '8000000', // bit_rate
            '0', // max_fps
            '-1', // lock_video_orientation (-1: unlocked)
            'false', // tunnel_forward
            '-', // crop
            'true', // always send frame meta (packet boundaries + timestamp)
            'true', // control
            '0', // display_id
            'true', // show_touches
            'true', // stay_awake
            '-', // codec_options
        );

        const videoStream = new AdbBufferedStream(await listener.next());
        const controlStream = new AdbBufferedStream(await listener.next());
        controlStreamRef.current = controlStream;

        await device.reverse.remove(reverseDeviceAddress);

        // device name, we have already knew it from adb
        await videoStream.read(64);

        const { width, height } = await Size.deserialize(videoStream);
        setWidth(width);
        setHeight(height);

        await Promise.all([
            receiveVideo(videoStream),
            receiveControl(controlStream),
        ]);

        await server.close();
    }, [device]);

    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        controlStreamRef.current!.write(new ArrayBuffer(10));
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {

    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {

    }, []);

    const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {

    }, []);

    return (
        <>
            <PrimaryButton
                content="Connect"
                onClick={connect}
            />
            <video
                width={width}
                height={height}
                style={{ transform: `scale(${scale})` }}
            />
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onKeyPress={handleKeyPress}
            />
        </>
    );
});
