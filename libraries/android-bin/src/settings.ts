import type { Adb, ProcessTextResult } from "@yume-chan/adb";
import { AdbServiceBase } from "@yume-chan/adb";

import { Cmd } from "./cmd.js";
import type { SingleUser } from "./utils.js";

export type SettingsNamespace = "system" | "secure" | "global";

export const SettingsResetMode = {
    UntrustedDefaults: "untrusted_defaults",
    UntrustedClear: "untrusted_clear",
    TrustedDefaults: "trusted_defaults",
} as const;

export type SettingsResetMode =
    (typeof SettingsResetMode)[keyof typeof SettingsResetMode];

export interface SettingsOptions {
    user?: SingleUser;
}

export interface SettingsPutOptions extends SettingsOptions {
    tag?: string;
    makeDefault?: boolean;
}

// frameworks/base/packages/SettingsProvider/src/com/android/providers/settings/SettingsService.java
export class Settings extends AdbServiceBase {
    #cmd: Cmd;

    constructor(adb: Adb) {
        super(adb);
        this.#cmd = new Cmd(adb);
    }

    async base(
        verb: string,
        namespace: SettingsNamespace,
        options: SettingsOptions | undefined,
        ...args: string[]
    ): Promise<string> {
        let command = ["settings"];

        if (options?.user !== undefined) {
            command.push("--user", options.user.toString());
        }

        command.push(verb, namespace);
        command = command.concat(args);

        let result: ProcessTextResult;
        if (this.#cmd.noneProtocol) {
            result = await this.#cmd.noneProtocol.spawnWaitText(command);
        } else {
            result =
                await this.adb.subprocess.noneProtocol.spawnWaitText(command);
        }

        if (result.stderr) {
            throw new Error(result.stderr);
        }

        return result.stdout;
    }

    async get(
        namespace: SettingsNamespace,
        key: string,
        options?: SettingsOptions,
    ): Promise<string> {
        const output = await this.base("get", namespace, options, key);
        // Remove last \n
        return output.substring(0, output.length - 1);
    }

    async delete(
        namespace: SettingsNamespace,
        key: string,
        options?: SettingsOptions,
    ): Promise<void> {
        await this.base("delete", namespace, options, key);
    }

    async put(
        namespace: SettingsNamespace,
        key: string,
        value: string,
        options?: SettingsPutOptions,
    ): Promise<void> {
        const args = [key, value];
        if (options?.tag) {
            args.push(options.tag);
        }
        if (options?.makeDefault) {
            args.push("default");
        }
        await this.base("put", namespace, options, ...args);
    }

    reset(
        namespace: SettingsNamespace,
        mode: SettingsResetMode,
        options?: SettingsOptions,
    ): Promise<void>;
    reset(
        namespace: SettingsNamespace,
        packageName: string,
        tag?: string,
        options?: SettingsOptions,
    ): Promise<void>;
    async reset(
        namespace: SettingsNamespace,
        modeOrPackageName: string,
        tagOrOptions?: string | SettingsOptions,
        options?: SettingsOptions,
    ): Promise<void> {
        const args = [modeOrPackageName];
        if (
            modeOrPackageName === SettingsResetMode.UntrustedDefaults ||
            modeOrPackageName === SettingsResetMode.UntrustedClear ||
            modeOrPackageName === SettingsResetMode.TrustedDefaults
        ) {
            options = tagOrOptions as SettingsOptions;
        } else if (typeof tagOrOptions === "string") {
            args.push(tagOrOptions);
        }
        await this.base("reset", namespace, options, ...args);
    }
}
