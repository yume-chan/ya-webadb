import { createMergedRef } from '@fluentui/react';
import React, { CSSProperties, HTMLAttributes, PropsWithChildren, useCallback, useRef } from 'react';
import { forwardRef } from './with-display-name';

export interface ResizeObserverProps extends HTMLAttributes<HTMLDivElement>, PropsWithChildren<{}> {
    onResize: (width: number, height: number) => void;
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
    const onResizeRef = useRef<(width: number, height: number) => void>(onResize);
    onResizeRef.current = onResize;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const mergedRef = createMergedRef<HTMLDivElement | null>()(ref, containerRef);

    const handleResize = useCallback(() => {
        const { width, height } = containerRef.current!.getBoundingClientRect();
        onResizeRef.current(width, height);
    }, []);

    const handleIframeRef = useCallback((element: HTMLIFrameElement | null) => {
        if (element) {
            element.contentWindow!.addEventListener('resize', handleResize);
        }
    }, []);

    const containerStyle: CSSProperties = React.useMemo(() => {
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
