import React, { useEffect, useRef } from 'react';
import { withDisplayName } from '../utils';
import { RouteProps } from './type';

export default withDisplayName('FrameBuffer', ({
    device
}: RouteProps): JSX.Element | null => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (!device) {
            return;
        }

        let running = true;
        let timeoutId: any;

        async function capture() {
            const start = window.performance.now();
            const framebuffer = await device!.framebuffer();
            const end = window.performance.now();
            console.log('time', end - start);

            const { width, height } = framebuffer;

            const canvas = canvasRef.current;
            if (!canvas) {
                return;
            }

            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext("2d")!;
            const image = new ImageData(new Uint8ClampedArray(framebuffer.data!), width, height);
            context.putImageData(image, 0, 0);

            if (running) {
                timeoutId = setTimeout(capture, 16);
            }
        }

        capture();

        return () => {
            running = false;
            clearTimeout(timeoutId);
        };
    }, [device]);

    return (
        <>
            <canvas ref={canvasRef} style={{ maxWidth: '100%' }} />
        </>
    );
});
