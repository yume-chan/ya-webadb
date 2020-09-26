import { AdbStreamBase, AdbStreamController } from './controller';

export class AdbStream implements AdbStreamBase {
    private controller: AdbStreamController;

    public get backend() { return this.controller.backend; }

    public get localId() { return this.controller.localId; }

    public get remoteId() { return this.controller.remoteId; }

    public get onData() { return this.controller.dataEvent.event; }

    public get onClose() { return this.controller.onClose; }

    public constructor(controller: AdbStreamController) {
        this.controller = controller;
    }

    public write(data: ArrayBuffer): Promise<void> {
        return this.controller.write(data);
    }

    public close(): Promise<void> {
        return this.controller.close();
    }
}
