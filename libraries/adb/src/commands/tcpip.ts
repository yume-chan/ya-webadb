import { AdbCommandBase } from "./base.js";

export class AdbTcpIpCommand extends AdbCommandBase {
    public async setPort(port: number): Promise<void> {
        if (port <= 0) {
            throw new Error(`Invalid port ${port}`);
        }

        const output = await this.adb.createSocketAndWait(`tcpip:${port}`);
        if (output !== `restarting in TCP mode port: ${port}\n`) {
            throw new Error("Invalid response");
        }
    }

    public async disable(): Promise<void> {
        const output = await this.adb.createSocketAndWait("usb:");
        if (output !== "restarting in USB mode\n") {
            throw new Error("Invalid response");
        }
    }
}
