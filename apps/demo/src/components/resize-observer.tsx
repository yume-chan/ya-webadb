import { makeStyles } from "@griffel/react";
import { useEffect, useState } from 'react';
import { useStableCallback, withDisplayName } from '../utils';

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

    const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);

    const handleResize = useStableCallback(() => {
        const { width, height } = iframe!.getBoundingClientRect();
        onResize({ width, height });
    });

    useEffect(() => {
        if (iframe) {
            void iframe.offsetLeft;
            iframe.contentWindow!.addEventListener('resize', handleResize);
            handleResize();
        }
    }, [iframe, handleResize]);

    return (
        <iframe ref={setIframe} className={classes.observer} />
    );
});
