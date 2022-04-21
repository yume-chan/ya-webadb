import { makeStyles } from "@griffel/react";
import { useLayoutEffect, useState } from 'react';
import { useCallbackRef, withDisplayName } from '../utils';

export interface Size {
    width: number;

    height: number;
}

export interface ResizeObserverProps {
    onResize: (size: Size) => void;
}

const useClasses = makeStyles({
    observer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        visibility: 'hidden',
    }
});

export const ResizeObserver = withDisplayName('ResizeObserver')(({
    onResize,
}: ResizeObserverProps): JSX.Element | null => {
    const classes = useClasses();

    const [iframeRef, setIframeRef] = useState<HTMLIFrameElement | null>(null);

    const handleResize = useCallbackRef(() => {
        const { width, height } = iframeRef!.getBoundingClientRect();
        onResize({ width, height });
    });

    useLayoutEffect(() => {
        if (iframeRef) {
            iframeRef.contentWindow!.addEventListener('resize', handleResize);
            handleResize();
        }
    }, [iframeRef]);

    return (
        <iframe ref={setIframeRef} className={classes.observer} />
    );
});
