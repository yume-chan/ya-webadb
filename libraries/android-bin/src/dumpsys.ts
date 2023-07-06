import { AdbCommandBase } from "@yume-chan/adb";

export class DumpSys extends AdbCommandBase {
    async diskStats() {
        const output = await this.adb.subprocess.spawnAndWaitLegacy([
            "dumpsys",
            "diskstats",
        ]);

        function getSize(name: string) {
            const match = output.match(
                new RegExp(`${name}-Free: (\\d+)K / (\\d+)K`)
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
}
