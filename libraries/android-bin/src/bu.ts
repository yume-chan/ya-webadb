import { AdbServiceBase } from "@yume-chan/adb";
import type { MaybeConsumable, ReadableStream } from "@yume-chan/stream-extra";

export interface AdbBackupOptions {
    user: number;
    saveSharedStorage?: boolean;
    saveWidgets?: boolean;
    packages: readonly string[] | "user" | "all";
    savePackageApk: boolean;
    savePackageObb: boolean;
    savePackageKeyValue: boolean;
    compress: boolean;
}

export interface AdbRestoreOptions {
    user: number;
    file: ReadableStream<MaybeConsumable<Uint8Array>>;
}

export class AdbBackup extends AdbServiceBase {
    /**
     * User must confirm backup on device within 60 seconds.
     */
    async backup(
        options: AdbBackupOptions,
    ): Promise<ReadableStream<Uint8Array>> {
        const args = ["bu", "backup"];

        if (options.user !== undefined) {
            args.push("--user", options.user.toString());
        }

        args.push(options.saveSharedStorage ? "--shared" : "--no-shared");
        args.push(options.saveWidgets ? "--widgets" : "--no-widgets");

        args.push(options.savePackageApk ? "--apk" : "--no-apk");
        args.push(options.savePackageObb ? "--obb" : "--no-obb");
        args.push(
            options.savePackageKeyValue ? "--key-value" : "--no-key-value",
        );

        args.push(options.compress ? "--compress" : "--no-compress");

        if (typeof options.packages === "string") {
            switch (options.packages) {
                case "user":
                    args.push("--all", "--no-system");
                    break;
                case "all":
                    args.push("--all", "--system");
                    break;
            }
        } else {
            args.push(...options.packages);
        }

        const process = await this.adb.subprocess.noneProtocol.spawn(args);
        return process.output;
    }

    /**
     * User must enter the password (if any) and
     * confirm restore on device within 60 seconds.
     */
    restore(options: AdbRestoreOptions): Promise<string> {
        const args = ["bu", "restore"];
        if (options.user !== undefined) {
            args.push("--user", options.user.toString());
        }
        return this.adb.subprocess.noneProtocol.spawnWaitText(args);
    }
}
