import { ICommandBarItemProps } from '@fluentui/react';
import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';
import { ErrorDialogContext } from '../error-dialog';
import { CommandBar, DeviceView, withDisplayName } from '../utils';
import { RouteProps } from './type';

export const FrameBuffer = withDisplayName('FrameBuffer')(({
    device
}: RouteProps): JSX.Element | null => {
    const { show: showErrorDialog } = useContext(ErrorDialogContext);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);

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
        }
    ], [device]);

    const commandBarFarItems = useMemo((): ICommandBarItemProps[] => [
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
    ], []);

    return (
        <>
            <CommandBar items={commandBarItems} farItems={commandBarFarItems} />
            <DeviceView width={width} height={height}>
                <canvas ref={canvasRef} />
            </DeviceView>
        </>
    );
});
