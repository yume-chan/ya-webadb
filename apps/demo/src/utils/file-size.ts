import { useSetInterval } from '@fluentui/react-hooks';
import { InspectStream } from "@yume-chan/adb";
import { useEffect, useRef, useState } from 'react';

const units = [' B', ' KB', ' MB', ' GB'];

export function formatSize(value: number): string {
    let index = 0;
    while (index < units.length && value > 1024) {
        index += 1;
        value /= 1024;
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 }) + units[index];
}

export function formatSpeed(completed: number, total: number, speed: number): string | undefined {
    if (total === 0) {
        return undefined;
    }
    return `${formatSize(completed)} of ${formatSize(total)} (${formatSize(speed)}/s)`;
}

export function useSpeed(completed: number, total: number): [completed: number, speed: number] {
    const completedRef = useRef(completed);
    completedRef.current = completed;

    const [debouncedCompleted, setDebouncedCompleted] = useState(completed);
    const [speed, setSpeed] = useState(0);

    const { setInterval, clearInterval } = useSetInterval();
    const intervalIdRef = useRef<number>();
    useEffect(() => {
        intervalIdRef.current = setInterval(() => {
            setDebouncedCompleted(debouncedCompleted => {
                setSpeed(completedRef.current - debouncedCompleted);
                return completedRef.current;
            });
        }, 1000);

        return () => {
            clearInterval(intervalIdRef.current!);
        };
    }, [total]);

    useEffect(() => {
        if (total !== 0 && completed === total) {
            setDebouncedCompleted(debouncedCompleted => {
                setSpeed(total - debouncedCompleted);
                return total;
            });
            clearInterval(intervalIdRef.current!);
        }
    }, [completed, total]);

    return [debouncedCompleted, speed];
}

export function delay(time: number): Promise<void> {
    return new Promise(resolve => {
        window.setTimeout(resolve, time);
    });
}

/**
 * Because of internal buffer of upstream/downstream streams,
 * the progress value won't be 100% accurate. But it's usually good enough.
 */
export class ProgressStream extends InspectStream<Uint8Array> {
    public constructor(onProgress: (value: number) => void) {
        let progress = 0;
        super(chunk => {
            progress += chunk.byteLength;
            onProgress(progress);
        });
    }
}
