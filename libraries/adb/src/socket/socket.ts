import { AdbSocketController, AdbSocketInfo } from './controller';

export class AdbSocket implements AdbSocketInfo {
    private readonly controller: AdbSocketController;

    get backend() { return this.controller.backend; }
    get localId() { return this.controller.localId; }
    get remoteId() { return this.controller.remoteId; }
    get localCreated() { return this.controller.localCreated; }
    get serviceString() { return this.controller.serviceString; }

    get closed() { return this.controller.closed; }

    get onData() { return this.controller.dataEvent.event; }
    get onClose() { return this.controller.onClose; }

    constructor(controller: AdbSocketController) {
        this.controller = controller;
    }

    write(data: ArrayBuffer): Promise<void> {
        return this.controller.write(data);
    }

    close(): Promise<void> {
        return this.controller.close();
    }
}
