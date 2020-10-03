import { useRef } from 'react';

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

export function useDebounced<T>(value: T, interval = 1000): T {
    const startTime = useRef(0);
    const startValue = useRef(value);

    const now = Date.now();
    if (now - startTime.current > interval) {
        startTime.current = now;
        startValue.current = value;
    }

    return startValue.current;
}

export function useSpeed(completed: number, total: number): [completed: number, speed: number] {
    const debouncedCompleted = useDebounced(completed);

    if (completed === total) {
        return [completed, completed - debouncedCompleted];
    } else {
        return [debouncedCompleted, completed - debouncedCompleted];
    }
}

export function delay(time: number): Promise<void> {
    return new Promise(resolve => {
        window.setTimeout(resolve, time);
    });
}
