export class DeviceBusyError extends Error {
    constructor(cause?: Error) {
        super("The device is already in use by another program", {
            cause,
        });
    }
}
