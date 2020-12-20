import { StackItem } from '@fluentui/react';
import React, { ReactNode, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ResizeObserver } from '../utils/resize-observer';
import { forwardRef } from '../utils/with-display-name';

export interface DeviceViewProps {
    width: number;

    height: number;

    children: ReactNode;
}

export interface DeviceViewRef {
    enterFullscreen(): void;
}

export const DeviceView = forwardRef<DeviceViewRef>('DeviceView')(({
    width,
    height,
    children,
}: DeviceViewProps, ref) => {
    const [containerWidth, setContainerWidth] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const [scale, setScale] = useState(1);

    const handleResize = useCallback((containerWidth: number, containerHeight: number) => {
        setContainerWidth(containerWidth);
        setContainerHeight(containerHeight);
    }, []);

    useEffect(() => {
        if (width === 0 || containerWidth === 0) {
            setScale(1);
            return;
        }

        const videoRatio = width / height;
        const containerRatio = containerWidth / containerHeight;
        if (videoRatio > containerRatio) {
            setScale(containerWidth / width);
        } else {
            setScale(containerHeight / height);
        }
    }, [width, height, containerWidth, containerHeight]);

    const containerRef = useRef<HTMLDivElement | null>(null);
    useImperativeHandle(ref, () => ({
        enterFullscreen() { containerRef.current!.requestFullscreen(); },
    }), []);

    return (
        <StackItem grow>
            <ResizeObserver
                ref={containerRef}
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'black',
                }}
                onResize={handleResize}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: `scale(${scale}) translate(-50%, -50%)`,
                        transformOrigin: 'top left',
                    }}
                >
                    {children}
                </div>
            </ResizeObserver>
        </StackItem>
    );
});
