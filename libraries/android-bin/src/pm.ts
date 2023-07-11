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

export interface PackageManagerListPackagesOptions {
    listDisabled: boolean;
    listEnabled: boolean;
    showSourceDir: boolean;
    showInstaller: boolean;
    listSystem: boolean;
    showUid: boolean;
    listThirdParty: boolean;
    showVersionCode: boolean;
    listApexOnly: boolean;
    user: "all" | "current" | number;
    uid: number;
    filter: string;
}

export const PACKAGE_MANAGER_LIST_PACKAGES_OPTIONS_MAP: Record<
    keyof PackageManagerListPackagesOptions,
    string
> = {
    listDisabled: "-d",
    listEnabled: "-e",
    showSourceDir: "-f",
    showInstaller: "-i",
    listSystem: "-s",
    showUid: "-U",
    listThirdParty: "-3",
    showVersionCode: "--show-versioncode",
    listApexOnly: "--apex-only",
    user: "--user",
    uid: "--uid",
    filter: "",
};

export interface PackageManagerListPackagesResult {
    packageName: string;
    sourceDir?: string | undefined;
    versionCode?: number | undefined;
    installer?: string | undefined;
    uid?: number | undefined;
}

export class PackageManager extends AdbCommandBase {
    #cmd: Cmd;

    constructor(adb: Adb) {
        super(adb);
        this.#cmd = new Cmd(adb);
    }

    #buildArguments<T>(
        commands: string[],
        options: Partial<T> | undefined,
        map: Record<keyof T, string>,
    ): string[] {
        const args = ["pm", ...commands];
        if (options) {
            for (const [key, value] of Object.entries(options)) {
                if (value) {
                    const option = map[key as keyof T];
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

    #buildInstallArguments(
        options: Partial<PackageManagerInstallOptions> | undefined,
    ): string[] {
        return this.#buildArguments(
            ["install"],
            options,
            PACKAGE_MANAGER_INSTALL_OPTIONS_MAP,
        );
    }

    async install(
        apks: string[],
        options?: Partial<PackageManagerInstallOptions>,
    ): Promise<string> {
        const args = this.#buildInstallArguments(options);
        // WIP: old version of pm doesn't support multiple apks
        args.push(...apks);
        return await this.adb.subprocess.spawnAndWaitLegacy(args);
    }

    async pushAndInstallStream(
        stream: ReadableStream<Consumable<Uint8Array>>,
        options?: Partial<PackageManagerInstallOptions>,
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

        // Starting from Android 7, `pm` is a only wrapper for `cmd package`,
        // and `cmd package` launches faster than `pm`.
        // But `cmd package` can't read `/data/local/tmp` folder due to SELinux policy,
        // so installing a file must use `pm`.
        const args = this.#buildInstallArguments(options);
        args.push(filePath);
        const process = await AdbSubprocessNoneProtocol.raw(
            this.adb,
            args.map(escapeArg).join(" "),
        );
        return new WrapReadableStream({
            start: () => process.stdout.pipeThrough(new DecodeUtf8Stream()),
            close: async () => {
                await this.adb.rm(filePath);
            },
        });
    }

    async installStream(
        size: number,
        stream: ReadableStream<Consumable<Uint8Array>>,
        options?: Partial<PackageManagerInstallOptions>,
    ): Promise<ReadableStream<string>> {
        // Android 7 added both `cmd` command and streaming install support,
        // we can't detect whether `pm` supports streaming install,
        // so we detect `cmd` command support instead.
        if (!this.#cmd.supportsCmd) {
            return this.pushAndInstallStream(stream, options);
        }

        const args = this.#buildInstallArguments(options);
        // Remove `pm` from args, final command will starts with `cmd package install`
        args.shift();
        args.push("-S", size.toString());
        const process = await this.#cmd.spawn(false, "package", ...args);
        await stream.pipeTo(process.stdin);
        return process.stdout.pipeThrough(new DecodeUtf8Stream());
    }

    static parsePackageListItem(
        line: string,
    ): PackageManagerListPackagesResult {
        line = line.substring("package:".length);

        let packageName: string;
        let sourceDir: string | undefined;
        let versionCode: number | undefined;
        let installer: string | undefined;
        let uid: number | undefined;

        // Parse backwards
        let index = line.indexOf(" uid:");
        if (index !== -1) {
            uid = Number.parseInt(line.substring(index + " uid:".length), 10);
            line = line.substring(0, index);
        }

        index = line.indexOf(" installer=");
        if (index !== -1) {
            installer = line.substring(index + " installer=".length);
            line = line.substring(0, index);
        }

        index = line.indexOf(" versionCode:");
        if (index !== -1) {
            versionCode = Number.parseInt(
                line.substring(index + " versionCode:".length),
                10,
            );
            line = line.substring(0, index);
        }

        // `sourceDir` may contain `=` so use `lastIndexOf`
        index = line.lastIndexOf("=");
        if (index !== -1) {
            sourceDir = line.substring(0, index);
            packageName = line.substring(index + "=".length);
        } else {
            packageName = line;
        }

        return {
            packageName,
            sourceDir,
            versionCode,
            installer,
            uid,
        };
    }

    async listPackages(
        options?: Partial<PackageManagerListPackagesOptions>,
    ): Promise<PackageManagerListPackagesResult[]> {
        const args = this.#buildArguments(
            ["list", "packages"],
            options,
            PACKAGE_MANAGER_LIST_PACKAGES_OPTIONS_MAP,
        );
        if (options?.filter) {
            args.push(options.filter);
        }
        const output = await this.adb.subprocess.spawnAndWaitLegacy(args);
        return output
            .split("\n")
            .filter((line) => !!line)
            .map((line) => PackageManager.parsePackageListItem(line));
    }

    // TODO: install: support split apk formats (`adb install-multiple`)
}
