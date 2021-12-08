import { StackItem } from '@fluentui/react';
import { ReactNode, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ResizeObserver, Size } from '../utils/resize-observer';
import { forwardRef } from '../utils/with-display-name';

export interface DeviceViewProps {
    width: number;

    height: number;

    bottomElement?: ReactNode;

    bottomHeight?: number;

    children?: ReactNode;
}

export interface DeviceViewRef {
    enterFullscreen(): void;
}

export const DeviceView = forwardRef<DeviceViewRef>('DeviceView')(({
    width,
    height,
    bottomElement,
    bottomHeight,
    children,
}: DeviceViewProps, ref) => {
    const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 });

    // Container size minus bottom element size
    const usableSize = useMemo(() => ({
        width: containerSize.width,
        height: containerSize.height - (bottomHeight ?? 0),
    }), [containerSize, bottomHeight]);

    // Compute sizes after scaling
    const childrenStyle = useMemo(() => {
        let scale: number;
        let childrenWidth: number;
        let childrenHeight: number;
        let childrenTop: number;
        let childrenLeft: number;

        if (width === 0 || usableSize.width === 0) {
            scale = 1;
            childrenWidth = 0;
            childrenHeight = 0;
            childrenTop = 0;
            childrenLeft = 0;
        } else {
            const videoRatio = width / height;
            const containerRatio = usableSize.width / usableSize.height;

            if (videoRatio > containerRatio) {
                scale = usableSize.width / width;
                childrenWidth = usableSize.width;
                childrenHeight = height * scale;
                childrenTop = (usableSize.height - childrenHeight) / 2;
                childrenLeft = 0;
            } else {
                scale = usableSize.height / height;
                childrenWidth = width * scale;
                childrenHeight = usableSize.height;
                childrenTop = 0;
                childrenLeft = (usableSize.width - childrenWidth) / 2;
            }
        }

        return {
            scale,
            width: childrenWidth,
            height: childrenHeight,
            top: childrenTop,
            left: childrenLeft,
        };
    }, [width, height, usableSize]);

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
                onResize={setContainerSize}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: childrenStyle.top,
                        left: childrenStyle.left,
                        width,
                        height,
                        transform: `scale(${childrenStyle.scale})`,
                        transformOrigin: 'top left',
                    }}
                >
                    {children}
                </div>

                {(!!width && !!bottomElement) && (
                    <div style={{
                        position: 'absolute',
                        top: childrenStyle.top + childrenStyle.height,
                        left: childrenStyle.left,
                        width: childrenStyle.width,
                        height: bottomHeight,
                    }}>
                        {bottomElement}
                    </div>
                )}
            </ResizeObserver>
        </StackItem>
    );
});
