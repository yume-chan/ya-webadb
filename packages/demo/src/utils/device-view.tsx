import { StackItem } from '@fluentui/react';
import React, { useCallback, useState } from 'react';
import { ReactNode } from 'react';
import { ResizeObserver } from './resize-observer';
import { withDisplayName } from './with-display-name';

export interface DeviceViewProps {
    width: number;

    height: number;

    children: ReactNode;
}

export const DeviceView = withDisplayName('DeviceView', ({ width, height, children }: DeviceViewProps) => {
    const [scale, setScale] = useState(1);

    const handleResize = useCallback((containerWidth: number, containerHeight: number) => {
        if (width === 0) {
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
    }, [width, height]);

    return (
        <StackItem grow>
            <ResizeObserver
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
