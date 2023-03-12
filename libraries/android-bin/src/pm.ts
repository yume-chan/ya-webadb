// cspell:ignore dont
// cspell:ignore instantapp
// cspell:ignore apks

import type { Adb } from "@yume-chan/adb";
import {
    AdbCommandBase,
    AdbSubprocessNoneProtocol,
    escapeArg,
} from "@yume-chan/adb";
import type { Consumable, ReadableStream } from "@yume-chan/stream-extra";
import { DecodeUtf8Stream, WrapReadableStream } from "@yume-chan/stream-extra";

import { Cmd } from "./cmd.js";

export enum PackageManagerInstallLocation {
    Auto,
    InternalOnly,
    PreferExternal,
}

export enum PackageManagerInstallReason {
    Unknown,
    AdminPolicy,
    DeviceRestore,
    DeviceSetup,
    UserRequest,
}

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
    internalStorage: boolean;
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
    installLocation: PackageManagerInstallLocation;
    /**
     * `--install-reason`
     */
    installReason: PackageManagerInstallReason;
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

export const PACKAGE_MANAGER_INSTALL_OPTIONS_MAP: Record<
    keyof PackageManagerInstallOptions,
    string
> = {
    skipExisting: "-R",
    installerPackageName: "-i",
    allowTest: "-t",
    internalStorage: "-f",
    requestDowngrade: "-d",
    grantRuntimePermissions: "-g",
    restrictPermissions: "--restrict-permissions",
    doNotKill: "--dont-kill",
    originatingUri: "--originating-uri",
    refererUri: "--referrer",
    inheritFrom: "-p",
    packageName: "--pkg",
    abi: "--abi",
    instantApp: "--instant",
    full: "--full",
    preload: "--preload",
    userId: "--user",
    installLocation: "--install-location",
    installReason: "--install-reason",
    forceUuid: "--force-uuid",
    apex: "--apex",
    forceNonStaged: "--force-non-staged",
    staged: "--staged",
    forceQueryable: "--force-queryable",
    enableRollback: "--enable-rollback",
    stagedReadyTimeout: "--staged-ready-timeout",
    skipVerification: "--skip-verification",
    bypassLowTargetSdkBlock: "--bypass-low-target-sdk-block",
};

export class PackageManager extends AdbCommandBase {
    private _cmd: Cmd;

    public constructor(adb: Adb) {
        super(adb);
        this._cmd = new Cmd(adb);
    }

    private buildInstallArgs(
        options?: Partial<PackageManagerInstallOptions>
    ): string[] {
        const args = ["pm", "install"];
        if (options) {
            for (const [key, value] of Object.entries(options)) {
                if (value) {
                    const option =
                        PACKAGE_MANAGER_INSTALL_OPTIONS_MAP[
                            key as keyof PackageManagerInstallOptions
                        ];
                    if (option) {
                        args.push(option);
                        switch (typeof value) {
                            case "number":
                                args.push(value.toString());
                                break;
                            case "string":
                                args.push(value);
                                break;
                        }
                    }
                }
            }
        }
        return args;
    }

    public async install(
        apks: string[],
        options?: Partial<PackageManagerInstallOptions>
    ): Promise<string> {
        const args = this.buildInstallArgs(options);
        // WIP: old version of pm doesn't support multiple apks
        args.push(...apks);
        return await this.adb.subprocess.spawnAndWaitLegacy(args);
    }

    public async pushAndInstallStream(
        stream: ReadableStream<Consumable<Uint8Array>>,
        options?: Partial<PackageManagerInstallOptions>
    ): Promise<ReadableStream<string>> {
        const sync = await this.adb.sync();

        const fileName = Math.random().toString().substring(2);
        const filePath = `/data/local/tmp/${fileName}.apk`;

        try {
            await sync.write({
                filename: filePath,
                file: stream,
            });
        } finally {
            await sync.dispose();
        }

        const args = this.buildInstallArgs(options);
        args.push(filePath);
        const process = await AdbSubprocessNoneProtocol.raw(
            this.adb,
            args.map(escapeArg).join(" ")
        );
        return new WrapReadableStream({
            start: () => process.stdout.pipeThrough(new DecodeUtf8Stream()),
            close: async () => {
                await this.adb.rm(filePath);
            },
        });
    }

    public async installStream(
        size: number,
        stream: ReadableStream<Consumable<Uint8Array>>,
        options?: Partial<PackageManagerInstallOptions>
    ): Promise<ReadableStream<string>> {
        if (!this._cmd.supportsCmd) {
            return this.pushAndInstallStream(stream, options);
        }

        // Android 7 added `cmd package` and piping apk to stdin,
        // the source code suggests using `cmd package` over `pm`, but didn't say why.
        // However, `cmd package install` can't read `/data/local/tmp` folder due to SELinux policy,
        // so even ADB today is still using `pm install` for non-streaming installs.
        const args = this.buildInstallArgs(options);
        // Remove `pm` from args, final command will be `cmd package install`
        args.shift();
        args.push("-S", size.toString());
        const process = await this._cmd.spawn(false, "package", ...args);
        await stream.pipeTo(process.stdin);
        return process.stdout.pipeThrough(new DecodeUtf8Stream());
    }

    // TODO: install: support split apk formats (`adb install-multiple`)
}
