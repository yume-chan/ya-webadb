import { AdbCommandBase } from "@yume-chan/adb";

export class DumpSys extends AdbCommandBase {
    async diskStats() {
        const output = await this.adb.subprocess.spawnAndWaitLegacy([
            "dumpsys",
            "diskstats",
        ]);

        function getSize(name: string) {
            const match = output.match(
                new RegExp(`${name}-Free: (\\d+)K / (\\d+)K`),
            );
            if (!match) {
                return [0, 0];
            }
            return [
                Number.parseInt(match[1]!, 10) * 1024,
                Number.parseInt(match[2]!, 10) * 1024,
            ];
        }

        const [dataFree, dataTotal] = getSize("Data");
        const [cacheFree, cacheTotal] = getSize("Cache");
        const [systemFree, systemTotal] = getSize("System");

        return {
            dataFree,
            dataTotal,
            cacheFree,
            cacheTotal,
            systemFree,
            systemTotal,
        };
    }

    async battery() {
        const output = await this.adb.subprocess.spawnAndWaitLegacy([
            "dumpsys",
            "battery",
        ]);

        let acPowered = false;
        let usbPowered = false;
        let wirelessPowered = false;
        let level: number | undefined;
        let scale: number | undefined;
        let voltage: number | undefined;
        let current: number | undefined;
        for (const line of output) {
            const parts = line.split(":");
            if (parts.length !== 2) {
                continue;
            }

            switch (parts[0]!.trim()) {
                case "AC powered":
                    acPowered = parts[1]!.trim() === "true";
                    break;
                case "USB powered":
                    usbPowered = parts[1]!.trim() === "true";
                    break;
                case "Wireless powered":
                    wirelessPowered = parts[1]!.trim() === "true";
                    break;
                case "level":
                    level = Number.parseInt(parts[1]!.trim(), 10);
                    break;
                case "scale":
                    scale = Number.parseInt(parts[1]!.trim(), 10);
                    break;
                case "voltage":
                    voltage = Number.parseInt(parts[1]!.trim(), 10);
                    break;
                case "current now":
                    current = Number.parseInt(parts[1]!.trim(), 10);
                    break;
            }
        }

        return {
            acPowered,
            usbPowered,
            wirelessPowered,
            level,
            scale,
            voltage,
            current,
        };
    }
}
