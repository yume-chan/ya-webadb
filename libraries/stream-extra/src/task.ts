export interface Task {
    run<T>(callback: () => T): T;
}

interface Console {
    createTask(name: string): Task;
}

interface GlobalExtension {
    console?: Console;
}

// `createTask` allows browser DevTools to track the call stack across async boundaries.
const global = globalThis as unknown as GlobalExtension;
export const createTask: (name: string) => Task =
    global.console?.createTask?.bind(global.console) ??
    (() => ({
        run(callback) {
            return callback();
        },
    }));
