import type { Adb } from "@yume-chan/adb";
import { AdbServiceBase } from "@yume-chan/adb";

import { Cmd } from "./cmd/index.js";
import type { IntentBuilder } from "./intent.js";
import type { SingleUser } from "./utils.js";
import { buildArguments } from "./utils.js";

export interface ActivityManagerStartActivityOptions {
    displayId?: number;
    windowingMode?: number;
    forceStop?: boolean;
    user?: SingleUser;
    intent: IntentBuilder;
}

const START_ACTIVITY_OPTIONS_MAP: Partial<
    Record<keyof ActivityManagerStartActivityOptions, string>
> = {
    displayId: "--display",
    windowingMode: "--windowingMode",
    forceStop: "-S",
    user: "--user",
};

export class ActivityManager extends AdbServiceBase {
    static ServiceName = "activity";
    static CommandName = "am";

    #cmd: Cmd.NoneProtocolService;

    constructor(adb: Adb) {
        super(adb);
        this.#cmd = Cmd.createNoneProtocolService(
            adb,
            ActivityManager.CommandName,
        );
    }

    async startActivity(
        options: ActivityManagerStartActivityOptions,
    ): Promise<void> {
        let args = buildArguments(
            [ActivityManager.ServiceName, "start-activity", "-W"],
            options,
            START_ACTIVITY_OPTIONS_MAP,
        );

        args = args.concat(options.intent.build());

        const output = await this.#cmd.spawn(args).wait().toString();

        for (let line of output.trim().split(/\r?\n/)) {
            line = line.trim();

            if (line.startsWith("Error:")) {
                throw new Error(line.substring("Error:".length).trim());
            }

            if (line === "Complete") {
                return;
            }
        }
    }
}
