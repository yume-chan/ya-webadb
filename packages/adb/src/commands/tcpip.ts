import { AdbCommandBase } from './base';

export class AdbTcpIpCommand extends AdbCommandBase {
    public async getAddresses(): Promise<string[]> {
        const propAddr = await this.adb.getProp('service.adb.listen_addrs');
        if (propAddr) {
            return propAddr.split(',');
        }

        let port = await this.adb.getProp('service.adb.tcp.port');
        if (port) {
            return [`0.0.0.0:${port}`];
        }

        port = await this.adb.getProp('persist.adb.tcp.port');
        if (port) {
            return [`0.0.0.0:${port}`];
        }

        return [];
    }

    public async setPort(port: number): Promise<void> {
        if (port <= 0) {
            throw new Error(`Invalid port ${port}`);
        }

        const output = await this.adb.createStreamAndReadAll(`tcpip:${port}`);
        if (output !== `restarting in TCP mode port: ${port}\n`) {
            throw new Error('Invalid response');
        }
    }

    public async disable(): Promise<void> {
        const output = await this.adb.createStreamAndReadAll('usb:');
        if (output !== 'restarting in USB mode\n') {
            throw new Error('Invalid response');
        }
    }
}
