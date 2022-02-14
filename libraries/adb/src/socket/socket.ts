import { ReadableStream, WritableStream } from "../utils";
import { AdbSocketController, AdbSocketInfo } from './controller';

export class AdbSocket implements AdbSocketInfo {
    private readonly controller: AdbSocketController;

    public get backend() { return this.controller.backend; }
    public get localId() { return this.controller.localId; }
    public get remoteId() { return this.controller.remoteId; }
    public get localCreated() { return this.controller.localCreated; }
    public get serviceString() { return this.controller.serviceString; }

    public get readable(): ReadableStream<ArrayBuffer> { return this.controller.readable; }
    public get writable(): WritableStream<ArrayBuffer> { return this.controller.writable; }

    public constructor(controller: AdbSocketController) {
        this.controller = controller;
    }

    public close(): Promise<void> {
        return this.controller.close();
    }
}
