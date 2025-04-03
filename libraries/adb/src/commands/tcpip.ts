import { AdbServiceBase } from "./base.js";

/**
 * ADB daemon checks for the following properties in the order of
 *
 * * `serviceListenAddresses` (`service.adb.listen_addrs`)
 * * `servicePort` (`service.adb.tcp.port`)
 * * `persistPort` (`persist.adb.tcp.port`)
 *
 * Once it finds a non-empty value, it will use it and ignore the rest.
 *
 * `serviceListenAddresses` and `persistPort` are fixed at build time,
 * only `servicePort` can be changed using `setPort` and `disable`.
 * This means if either `serviceListenAddresses` or `persistPort` is non-empty,
 * ADB over WiFi is always enabled.
 */
export interface AdbTcpIpListenAddresses {
    serviceListenAddresses: string[];
    servicePort: number | undefined;
    persistPort: number | undefined;
}

function parsePort(value: string): number | undefined {
    if (!value || value === "0") {
        return undefined;
    }
    return Number.parseInt(value, 10);
}

export class AdbTcpIpService extends AdbServiceBase {
    async getListenAddresses(): Promise<AdbTcpIpListenAddresses> {
        const serviceListenAddresses = await this.adb.getProp(
            "service.adb.listen_addrs",
        );
        const servicePort = await this.adb.getProp("service.adb.tcp.port");
        const persistPort = await this.adb.getProp("persist.adb.tcp.port");

        return {
            serviceListenAddresses:
                serviceListenAddresses != ""
                    ? serviceListenAddresses.split(",")
                    : [],
            servicePort: parsePort(servicePort),
            persistPort: parsePort(persistPort),
        };
    }

    async setPort(port: number): Promise<string> {
        if (port <= 0) {
            throw new TypeError(`Invalid port ${port}`);
        }

        const output = await this.adb.createSocketAndWait(`tcpip:${port}`);
        if (output !== `restarting in TCP mode port: ${port}\n`) {
            throw new Error(output);
        }
        return output;
    }

    async disable(): Promise<string> {
        const output = await this.adb.createSocketAndWait("usb:");
        if (output !== "restarting in USB mode\n") {
            throw new Error(output);
        }
        return output;
    }
}
