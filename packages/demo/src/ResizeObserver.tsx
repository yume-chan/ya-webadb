import React, { CSSProperties, HTMLAttributes, PropsWithChildren, useCallback, useRef } from 'react';
import withDisplayName from './withDisplayName';

export interface ResizeObserverProps extends HTMLAttributes<HTMLDivElement>, PropsWithChildren<{}> {
    onResize: () => void;
}

const iframeStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    visibility: 'hidden',
};

export default withDisplayName('ResizeObserver', ({
    onResize,
    style,
    children,
    ...rest
}: ResizeObserverProps): JSX.Element | null => {
    const onResizeRef = useRef<() => void>(onResize);
    onResizeRef.current = onResize;

    const handleResize = useCallback(() => {
        onResizeRef.current();
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
        <div style={containerStyle} {...rest}>
            <iframe ref={handleIframeRef} style={iframeStyle} />
            {children}
        </div>
    )
});
