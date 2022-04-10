import { createMergedRef } from '@fluentui/react';
import { CSSProperties, HTMLAttributes, PropsWithChildren, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { forwardRef, useCallbackRef } from '../utils';

export interface Size {
    width: number;

    height: number;
}

export interface ResizeObserverProps extends HTMLAttributes<HTMLDivElement>, PropsWithChildren<{}> {
    onResize: (size: Size) => void;
}

const iframeStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    visibility: 'hidden',
};

export const ResizeObserver = forwardRef<HTMLDivElement>('ResizeObserver')(({
    onResize,
    style,
    children,
    ...rest
}: ResizeObserverProps, ref): JSX.Element | null => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mergedRef = createMergedRef<HTMLDivElement | null>()(ref, containerRef);

    const handleResize = useCallbackRef(() => {
        const { width, height } = containerRef.current!.getBoundingClientRect();
        onResize({ width, height });
    });

    useLayoutEffect(() => {
        handleResize();
    }, []);

    const handleIframeRef = useCallback((element: HTMLIFrameElement | null) => {
        if (element) {
            element.contentWindow!.addEventListener('resize', handleResize);
        }
    }, []);

    const containerStyle: CSSProperties = useMemo(() => {
        if (!style) {
            return { position: 'relative' };
        }

        if (!style.position) {
            return { ...style, position: 'relative' };
        }

        return style;
    }, [style]);

    return (
        <div ref={mergedRef} style={containerStyle} {...rest}>
            <iframe ref={handleIframeRef} style={iframeStyle} />
            {children}
        </div>
    );
});
