import type { Adb } from "@yume-chan/adb";
import { AdbCommandBase } from "@yume-chan/adb";
import { ConcatStringStream, TextDecoderStream } from "@yume-chan/stream-extra";

import { Cmd } from "./cmd.js";
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

export class ActivityManager extends AdbCommandBase {
    #cmd: Cmd;

    constructor(adb: Adb) {
        super(adb);
        this.#cmd = new Cmd(adb);
    }

    async #cmdOrSubprocess(args: string[]) {
        if (this.#cmd.supportsCmd) {
            args.shift();
            return await this.#cmd.spawn(false, "activity", ...args);
        }

        return this.adb.subprocess.spawn(args);
    }

    async startActivity(
        options: ActivityManagerStartActivityOptions,
    ): Promise<void> {
        let args = buildArguments(
            ["am", "start-activity", "-W"],
            options,
            START_ACTIVITY_OPTIONS_MAP,
        );

        args = args.concat(options.intent.build());

        const process = await this.#cmdOrSubprocess(args);

        const output = await process.stdout
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(new ConcatStringStream())
            .then((output) => output.trim());

        for (const line of output) {
            if (line.startsWith("Error:")) {
                throw new Error(line.substring("Error:".length).trim());
            }
            if (line === "Complete") {
                return;
            }
        }
    }
}
