import { AdbPacket, AdbPacketCore } from '../packet';
import { AdbSocket } from './socket';

export interface AdbLogger {
    onIncomingPacket?(packet: AdbPacket): void;

    onOutgoingPacket?(packet: AdbPacketCore): void;

    onSocketOpened?(socket: AdbSocket): void;

    onSocketClosed?(socket: AdbSocket): void;
}
