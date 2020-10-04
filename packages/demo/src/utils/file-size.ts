import { useSetInterval } from '@uifabric/react-hooks';
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

export function useSpeed(completed: number): [completed: number, speed: number] {
    const completedRef = useRef(completed);
    completedRef.current = completed;

    const [debouncedCompleted, setDebouncedCompleted] = useState(completed);
    const [speed, setSpeed] = useState(0);

    const { setInterval } = useSetInterval();
    useEffect(() => {
        setInterval(() => {
            setDebouncedCompleted(debouncedCompleted => {
                setSpeed(completedRef.current - debouncedCompleted);
                return completedRef.current;
            });
        }, 1000);
    }, []);

    return [debouncedCompleted, speed];
}

export function delay(time: number): Promise<void> {
    return new Promise(resolve => {
        window.setTimeout(resolve, time);
    });
}
