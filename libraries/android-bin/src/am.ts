import type { Adb } from "@yume-chan/adb";
import { AdbServiceBase } from "@yume-chan/adb";
import { SplitStringStream, TextDecoderStream } from "@yume-chan/stream-extra";

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
        this.#cmd = Cmd.createNoneProtocol(adb, ActivityManager.CommandName);
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

        const process = await this.#cmd.spawn(args);
        const lines = process.output
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(new SplitStringStream("\n", { trim: true }));

        for await (const line of lines) {
            if (line.startsWith("Error:")) {
                // Exit from the `for await` loop will cancel `lines`,
                // and subsequently, `process`, which is fine, as the work is already done
                throw new Error(line.substring("Error:".length).trim());
            }

            if (line === "Complete") {
                // Same as above
                return;
            }
        }
    }
}
