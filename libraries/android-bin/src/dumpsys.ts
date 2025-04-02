import { AdbServiceBase } from "@yume-chan/adb";

const BatteryDumpFields: Record<
    string,
    {
        type: "number" | "boolean" | "string";
        field: keyof DumpSys.Battery.Info;
    }
> = {
    "AC powered": { type: "boolean", field: "acPowered" },
    "USB powered": { type: "boolean", field: "usbPowered" },
    "Wireless powered": { type: "boolean", field: "wirelessPowered" },
    "Dock powered": { type: "boolean", field: "dockPowered" },
    "Max charging current": {
        type: "number",
        field: "maxChargingCurrent",
    },
    "Max charging voltage": {
        type: "number",
        field: "maxChargingVoltage",
    },
    "Charge counter": { type: "number", field: "chargeCounter" },
    status: { type: "number", field: "status" },
    health: { type: "number", field: "health" },
    present: { type: "boolean", field: "present" },
    level: { type: "number", field: "level" },
    scale: { type: "number", field: "scale" },
    voltage: { type: "number", field: "voltage" },
    temperature: { type: "number", field: "temperature" },
    technology: { type: "string", field: "technology" },
    current: { type: "number", field: "current" },
};

const Status = {
    Unknown: 1,
    Charging: 2,
    Discharging: 3,
    NotCharging: 4,
    Full: 5,
} as const;

const Health = {
    Unknown: 1,
    Good: 2,
    Overheat: 3,
    Dead: 4,
    OverVoltage: 5,
    UnspecifiedFailure: 6,
    Cold: 7,
} as const;

const Battery = {
    Status,
    Health,
};

export class DumpSys extends AdbServiceBase {
    static readonly Battery = Battery;

    async diskStats() {
        const result = await this.adb.subprocess.noneProtocol.spawnWaitText([
            "dumpsys",
            "diskstats",
        ]);

        function getSize(name: string) {
            const match = result.match(
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

    async battery(): Promise<DumpSys.Battery.Info> {
        const result = await this.adb.subprocess.noneProtocol.spawnWaitText([
            "dumpsys",
            "battery",
        ]);

        const info: DumpSys.Battery.Info = {
            acPowered: false,
            usbPowered: false,
            wirelessPowered: false,
            dockPowered: false,
            status: DumpSys.Battery.Status.Unknown,
            health: DumpSys.Battery.Health.Unknown,
        };

        for (const line of result.split("\n")) {
            const parts = line.split(":").map((part) => part.trim());
            if (parts.length !== 2) {
                continue;
            }

            const field = BatteryDumpFields[parts[0]!];
            if (!field) {
                continue;
            }

            switch (field.type) {
                case "boolean":
                    info[field.field] = (parts[1]!.trim() === "true") as never;
                    break;
                case "number":
                    info[field.field] = Number.parseInt(
                        parts[1]!.trim(),
                        10,
                    ) as never;
                    break;
                case "string":
                    info[field.field] = parts[1]! as never;
                    break;
            }
        }

        return info;
    }
}

export namespace DumpSys {
    export namespace Battery {
        export type Status = (typeof Status)[keyof typeof Status];
        export type Health = (typeof Health)[keyof typeof Health];

        export interface Info {
            acPowered: boolean;
            usbPowered: boolean;
            wirelessPowered: boolean;
            dockPowered: boolean;
            maxChargingCurrent?: number;
            maxChargingVoltage?: number;
            chargeCounter?: number;
            status: Status;
            health: Health;
            present?: boolean;
            level?: number;
            scale?: number;
            voltage?: number;
            temperature?: number;
            technology?: string;
            current?: number;
        }
    }
}
