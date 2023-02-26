// cspell:ignore dont
// cspell:ignore instantapp
// cspell:ignore apks

import { AdbCommandBase } from "@yume-chan/adb";
import type { WritableStream } from "@yume-chan/stream-extra";

// https://cs.android.com/android/platform/superproject/+/master:frameworks/base/services/core/java/com/android/server/pm/PackageManagerShellCommand.java;l=3046;drc=6d14d35d0241f6fee145f8e54ffd77252e8d29fd
export interface PackageManagerInstallOptions {
    /**
     * `-R`
     */
    skipExisting: boolean;
    /**
     * `-i`
     */
    installerPackageName: string;
    /**
     * `-t`
     */
    allowTest: boolean;
    /**
     * `-f`
     */
    internal: boolean;
    /**
     * `-d`
     */
    requestDowngrade: boolean;
    /**
     * `-g`
     */
    grantRuntimePermissions: boolean;
    /**
     * `--restrict-permissions`
     */
    restrictPermissions: boolean;
    /**
     * `--dont-kill`
     */
    doNotKill: boolean;
    /**
     * `--originating-uri`
     */
    originatingUri: string;
    /**
     * `--referrer`
     */
    refererUri: string;
    /**
     * `-p`
     */
    inheritFrom: string;
    /**
     * `--pkg`
     */
    packageName: string;
    /**
     * `--abi`
     */
    abi: string;
    /**
     * `--ephemeral`/`--instant`/`--instantapp`
     */
    instantApp: boolean;
    /**
     * `--full`
     */
    full: boolean;
    /**
     * `--preload`
     */
    preload: boolean;
    /**
     * `--user`
     */
    userId: number;
    /**
     * `--install-location`
     */
    installLocation: number;
    /**
     * `--install-reason`
     */
    installReason: number;
    /**
     * `--force-uuid`
     */
    forceUuid: string;
    /**
     * `--apex`
     */
    apex: boolean;
    /**
     * `--force-non-staged`
     */
    forceNonStaged: boolean;
    /**
     * `--multi-package`
     */
    multiPackage: boolean;
    /**
     * `--staged`
     */
    staged: boolean;
    /**
     * `--force-queryable`
     */
    forceQueryable: boolean;
    /**
     * `--enable-rollback`
     */
    enableRollback: boolean;
    /**
     * `--staged-ready-timeout`
     */
    stagedReadyTimeout: number;
    /**
     * `--skip-verification`
     */
    skipVerification: boolean;
    /**
     * `--bypass-low-target-sdk-block`
     */
    bypassLowTargetSdkBlock: boolean;
}

export class PackageManager extends AdbCommandBase {
    private buildInstallArgs(
        options: Partial<PackageManagerInstallOptions>
    ): string[] {
        const args = ["pm", "install"];
        if (options.skipExisting) {
            args.push("-R");
        }
        if (options.installerPackageName) {
            args.push("-i", options.installerPackageName);
        }
        if (options.allowTest) {
            args.push("-t");
        }
        if (options.internal) {
            args.push("-f");
        }
        if (options.requestDowngrade) {
            args.push("-d");
        }
        if (options.grantRuntimePermissions) {
            args.push("-g");
        }
        if (options.restrictPermissions) {
            args.push("--restrict-permissions");
        }
        if (options.doNotKill) {
            args.push("--dont-kill");
        }
        if (options.originatingUri) {
            args.push("--originating-uri", options.originatingUri);
        }
        if (options.refererUri) {
            args.push("--referrer", options.refererUri);
        }
        if (options.inheritFrom) {
            args.push("-p", options.inheritFrom);
        }
        if (options.packageName) {
            args.push("--pkg", options.packageName);
        }
        if (options.abi) {
            args.push("--abi", options.abi);
        }
        if (options.instantApp) {
            args.push("--instant");
        }
        if (options.full) {
            args.push("--full");
        }
        if (options.preload) {
            args.push("--preload");
        }
        if (options.userId) {
            args.push("--user", options.userId.toString());
        }
        if (options.installLocation) {
            args.push("--install-location", options.installLocation.toString());
        }
        if (options.installReason) {
            args.push("--install-reason", options.installReason.toString());
        }
        if (options.forceUuid) {
            args.push("--force-uuid", options.forceUuid);
        }
        if (options.apex) {
            args.push("--apex");
        }
        if (options.forceNonStaged) {
            args.push("--force-non-staged");
        }
        if (options.multiPackage) {
            args.push("--multi-package");
        }
        if (options.staged) {
            args.push("--staged");
        }
        if (options.forceQueryable) {
            args.push("--force-queryable");
        }
        if (options.enableRollback) {
            args.push("--enable-rollback");
        }
        if (options.stagedReadyTimeout) {
            args.push(
                "--staged-ready-timeout",
                options.stagedReadyTimeout.toString()
            );
        }
        if (options.skipVerification) {
            args.push("--skip-verification");
        }
        if (options.bypassLowTargetSdkBlock) {
            args.push("--bypass-low-target-sdk-block");
        }
        return args;
    }

    public async install(
        options: Partial<PackageManagerInstallOptions>,
        ...apks: string[]
    ): Promise<void> {
        const args = this.buildInstallArgs(options);
        args.push(...apks);
        await this.adb.subprocess.spawnAndWaitLegacy(args);
    }

    public async installStream(
        options: Partial<PackageManagerInstallOptions>,
        size: number
    ): Promise<WritableStream<Uint8Array>> {
        const args = this.buildInstallArgs(options);
        args.push("-S", size.toString());
        return (await this.adb.subprocess.spawn(args)).stdin;
    }
}
