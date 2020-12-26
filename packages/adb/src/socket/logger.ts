import { AdbPacket } from '../packet';
import { AdbSocket } from './socket';

export interface AdbLogger {
    onIncomingPacket?(packet: AdbPacket): void;

    onOutgoingPacket?(packet: AdbPacket): void;

    onSocketOpened?(socket: AdbSocket): void;

    onSocketClosed?(socket: AdbSocket): void;
}
