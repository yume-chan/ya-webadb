export function delay(time: number): Promise<void> {
    return new Promise(resolve => {
        (globalThis as any).setTimeout(resolve, time);
    });
}
