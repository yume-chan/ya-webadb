import { AdbSocketController, AdbSocketInfo } from './controller';

export class AdbSocket implements AdbSocketInfo {
    private readonly controller: AdbSocketController;

    public get backend() { return this.controller.backend; }
    public get localId() { return this.controller.localId; }
    public get remoteId() { return this.controller.remoteId; }
    public get localCreated() { return this.controller.localCreated; }
    public get serviceString() { return this.controller.serviceString; }

    public get closed() { return this.controller.closed; }

    public get onData() { return this.controller.dataEvent.event; }
    public get onClose() { return this.controller.onClose; }

    public constructor(controller: AdbSocketController) {
        this.controller = controller;
    }

    public write(data: ArrayBuffer): Promise<void> {
        return this.controller.write(data);
    }

    public close(): Promise<void> {
        return this.controller.close();
    }
}
