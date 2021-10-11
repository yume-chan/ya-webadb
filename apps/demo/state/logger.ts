import { AdbLogger, AdbPacket, AdbPacketInit } from "@yume-chan/adb";
import { EventEmitter } from "@yume-chan/event";

export class AdbEventLogger {
    private readonly _logger: AdbLogger;
    public get logger() { return this._logger; }

    private readonly _incomingPacketEvent = new EventEmitter<AdbPacket>();
    public get onIncomingPacket() { return this._incomingPacketEvent.event; }

    private readonly _outgoingPacketEvent = new EventEmitter<AdbPacketInit>();
    public get onOutgoingPacket() { return this._outgoingPacketEvent.event; }

    public constructor() {
        this._logger = {
            onIncomingPacket: (packet) => {
                this._incomingPacketEvent.fire(packet);
            },
            onOutgoingPacket: (packet) => {
                this._outgoingPacketEvent.fire(packet);
            },
        };
    }
}

export const logger = new AdbEventLogger();
