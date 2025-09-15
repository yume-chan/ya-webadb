import type { Adb, AdbNoneProtocolProcess } from "@yume-chan/adb";
import { AdbServiceBase, escapeArg } from "@yume-chan/adb";
import { SplitStringStream, TextDecoderStream } from "@yume-chan/stream-extra";

import { Cmd } from "./cmd/index.js";
import type { Intent } from "./intent.js";
import { serializeIntent } from "./intent.js";
import type { SingleUser, SingleUserOrAll } from "./utils.js";
import { buildCommand } from "./utils.js";

export interface ActivityManagerStartActivityOptions {
    displayId?: number;
    windowingMode?: number;
    forceStop?: boolean;
    user?: SingleUser;
    intent: Intent;
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
    static readonly ServiceName = "activity";
    static readonly CommandName = "am";

    #apiLevel: number | undefined;
    #cmd: Cmd.NoneProtocolService;

    constructor(adb: Adb, apiLevel?: number) {
        super(adb);

        this.#apiLevel = apiLevel;
        this.#cmd = Cmd.createNoneProtocol(adb, ActivityManager.CommandName);
    }

    async startActivity(
        options: ActivityManagerStartActivityOptions,
    ): Promise<void> {
        // Android 8 added "start-activity" alias to "start"
        // but we want to use the most compatible one.
        const command = buildCommand(
            [ActivityManager.ServiceName, "start", "-W"],
            options,
            START_ACTIVITY_OPTIONS_MAP,
        );

        for (const arg of serializeIntent(options.intent)) {
            command.push(arg);
        }

        // Android 7 supports `cmd activity` but not `cmd activity start` command
        let process: AdbNoneProtocolProcess;
        if (this.#apiLevel !== undefined && this.#apiLevel <= 25) {
            command[0] = ActivityManager.CommandName;
            process = await this.adb.subprocess.noneProtocol.spawn(
                command.map(escapeArg),
            );
        } else {
            process = await this.#cmd.spawn(command);
        }

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

        // Ensure the subprocess exits before returning
        await process.exited;
    }

    async broadcast(
        intent: Intent,
        options?: { user?: SingleUserOrAll; receiverPermission?: string },
    ) {
        const command = [ActivityManager.ServiceName, "broadcast"];

        if (options) {
            if (options.user !== undefined) {
                command.push("--user", options.user.toString());
            }
            if (options.receiverPermission) {
                command.push(
                    "--receiver-permission",
                    options.receiverPermission,
                );
            }
        }

        for (const arg of serializeIntent(intent)) {
            command.push(arg);
        }

        // Android 7 supports `cmd activity` but not `cmd activity broadcast` command
        if (this.#apiLevel !== undefined && this.#apiLevel <= 25) {
            command[0] = ActivityManager.CommandName;
            await this.adb.subprocess.noneProtocol
                .spawn(command.map(escapeArg))
                .wait();
        } else {
            await this.#cmd.spawn(command).wait();
        }
    }
}
