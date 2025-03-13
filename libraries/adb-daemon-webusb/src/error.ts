export class DeviceBusyError extends Error {
    constructor(cause?: Error) {
        super("The device is already in used by another program", {
            cause,
        });
    }
}
