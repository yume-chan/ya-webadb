import { ICommandBarItemProps, Stack, StackItem } from '@fluentui/react';
import { useBoolean } from '@uifabric/react-hooks';
import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CommandBar, DemoMode, DeviceView, ErrorDialogContext } from '../components';
import { withDisplayName } from '../utils';
import { RouteProps } from './type';

export const FrameBuffer = withDisplayName('FrameBuffer')(({
    device
}: RouteProps): JSX.Element | null => {
    const { show: showErrorDialog } = useContext(ErrorDialogContext);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [hasImage, setHasImage] = useState(false);

    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);

    const [settingsVisible, { toggle: toggleSettingsVisible }] = useBoolean(false);

    const capture = useCallback(() => {
        if (!device) {
            return;
        }

        (async function () {
            try {
                const start = window.performance.now();
                const framebuffer = await device!.framebuffer();
                const end = window.performance.now();
                console.log('time', end - start);

                const { width, height } = framebuffer;

                const canvas = canvasRef.current;
                if (!canvas) {
                    return;
                }

                setWidth(width);
                setHeight(height);
                canvas.width = width;
                canvas.height = height;

                const context = canvas.getContext("2d")!;
                const image = new ImageData(new Uint8ClampedArray(framebuffer.data!), width, height);
                context.putImageData(image, 0, 0);
                setHasImage(true);
            } catch (e) {
                showErrorDialog(e.message);
            }
        })();
    }, [device]);

    const commandBarItems = useMemo((): ICommandBarItemProps[] => [
        {
            key: 'start',
            disabled: !device,
            iconProps: { iconName: 'Camera' },
            text: 'Capture',
            onClick: capture,
        },
        {
            key: 'Save',
            disabled: !hasImage,
            iconProps: { iconName: 'Save' },
            text: 'Save',
            onClick: () => {
                const canvas = canvasRef.current;
                if (!canvas) {
                    return;
                }

                const url = canvas.toDataURL();
                const a = document.createElement('a');
                a.href = url;
                a.download = `Screenshot of ${device!.name}.png`;
                a.click();
            },
        }
    ], [device, hasImage]);

    const commandBarFarItems = useMemo((): ICommandBarItemProps[] => [
        {
            key: 'Settings',
            iconProps: { iconName: 'Settings' },
            checked: settingsVisible,
            text: 'Toggle Settings',
            onClick: toggleSettingsVisible,
        },
        {
            key: 'info',
            iconProps: { iconName: 'Info' },
            iconOnly: true,
            tooltipHostProps: {
                content: 'Use ADB FrameBuffer command to capture a full-size, high-resolution screenshot.',
                calloutProps: {
                    calloutMaxWidth: 250,
                }
            },
        }
    ], [settingsVisible]);

    return (
        <>
            <CommandBar items={commandBarItems} farItems={commandBarFarItems} />
            <Stack horizontal grow styles={{ root: { height: 0 } }}>
                <DeviceView width={width} height={height}>
                    <canvas ref={canvasRef} style={{ display: 'block' }} />
                </DeviceView>

                <DemoMode
                    device={device}
                    style={{ display: settingsVisible ? 'block' : 'none' }}
                />
            </Stack>
        </>
    );
});
