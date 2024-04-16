// cspell:ignore dont
// cspell:ignore instantapp
// cspell:ignore apks
// cspell:ignore versioncode

import type { Adb } from "@yume-chan/adb";
import { AdbCommandBase, escapeArg } from "@yume-chan/adb";
import type { MaybeConsumable, ReadableStream } from "@yume-chan/stream-extra";
import {
    ConcatStringStream,
    DecodeUtf8Stream,
    SplitStringStream,
} from "@yume-chan/stream-extra";

import { Cmd } from "./cmd.js";
import type { IntentBuilder } from "./intent.js";
import type { SingleUserOrAll } from "./utils.js";
import { buildArguments } from "./utils.js";

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
    user: SingleUserOrAll;
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
    user: "--user",
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
    user: SingleUserOrAll;
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

export interface PackageManagerUninstallOptions {
    keepData: boolean;
    user: SingleUserOrAll;
    versionCode: number;
    /**
     * Only remove the specified splits, not the entire app
     *
     * On Android 10 and lower, only one split name can be specified.
     */
    splitNames: string[];
}

const PACKAGE_MANAGER_UNINSTALL_OPTIONS_MAP: Record<
    keyof PackageManagerUninstallOptions,
    string
> = {
    keepData: "-k",
    user: "--user",
    versionCode: "--versionCode",
    splitNames: "",
};

export interface PackageManagerResolveActivityOptions {
    user?: SingleUserOrAll;
    intent: IntentBuilder;
}

const PACKAGE_MANAGER_RESOLVE_ACTIVITY_OPTIONS_MAP: Partial<
    Record<keyof PackageManagerResolveActivityOptions, string>
> = {
    user: "--user",
};

export class PackageManager extends AdbCommandBase {
    #cmd: Cmd;

    constructor(adb: Adb) {
        super(adb);
        this.#cmd = new Cmd(adb);
    }

    #buildInstallArguments(
        command: string,
        options: Partial<PackageManagerInstallOptions> | undefined,
    ): string[] {
        const args = buildArguments(
            ["pm", command],
            options,
            PACKAGE_MANAGER_INSTALL_OPTIONS_MAP,
        );
        if (!options?.skipExisting) {
            // Compatibility with old versions of pm
            args.push("-r");
        }
        return args;
    }

    /**
     * Install the apk file.
     *
     * @param apks Path to the apk file. It must exist on the device. On Android 10 and lower, only one apk can be specified.
     */
    async install(
        apks: string[],
        options?: Partial<PackageManagerInstallOptions>,
    ): Promise<string> {
        const args = this.#buildInstallArguments("install", options);
        // WIP: old version of pm doesn't support multiple apks
        args.push(...apks);
        return await this.adb.subprocess.spawnAndWaitLegacy(args);
    }

    async pushAndInstallStream(
        stream: ReadableStream<MaybeConsumable<Uint8Array>>,
        options?: Partial<PackageManagerInstallOptions>,
    ): Promise<void> {
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

        // Starting from Android 7, `pm` is only a wrapper for `cmd package`,
        // and `cmd package` launches faster than `pm`.
        // But `cmd package` can't read `/data/local/tmp` folder due to SELinux policy,
        // so installing a file must use `pm`.
        const args = this.#buildInstallArguments("install", options);
        args.push(filePath);

        try {
            const output = await this.adb.subprocess
                .spawnAndWaitLegacy(args.map(escapeArg))
                .then((output) => output.trim());

            if (output !== "Success") {
                throw new Error(output);
            }
        } finally {
            await this.adb.rm(filePath);
        }
    }

    async installStream(
        size: number,
        stream: ReadableStream<MaybeConsumable<Uint8Array>>,
        options?: Partial<PackageManagerInstallOptions>,
    ): Promise<void> {
        // Android 7 added both `cmd` command and streaming install support,
        // we can't detect whether `pm` supports streaming install,
        // so we detect `cmd` command support instead.
        if (!this.#cmd.supportsCmd) {
            await this.pushAndInstallStream(stream, options);
            return;
        }

        const args = this.#buildInstallArguments("install", options);
        // Remove `pm` from args, final command will starts with `cmd package install`
        args.shift();
        args.push("-S", size.toString());
        const process = await this.#cmd.spawn(false, "package", ...args);

        const output = process.stdout
            .pipeThrough(new DecodeUtf8Stream())
            .pipeThrough(new ConcatStringStream())
            .then((output) => output.trim());

        await Promise.all([
            stream.pipeTo(process.stdin),
            output.then((output) => {
                if (output !== "Success") {
                    throw new Error(output);
                }
            }),
        ]);
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

    async #cmdOrSubprocess(args: string[]) {
        if (this.#cmd.supportsCmd) {
            args.shift();
            return await this.#cmd.spawn(false, "package", ...args);
        }

        return this.adb.subprocess.spawn(args);
    }

    async *listPackages(
        options?: Partial<PackageManagerListPackagesOptions>,
    ): AsyncGenerator<PackageManagerListPackagesResult, void, void> {
        const args = buildArguments(
            ["pm", "list", "packages"],
            options,
            PACKAGE_MANAGER_LIST_PACKAGES_OPTIONS_MAP,
        );
        if (options?.filter) {
            args.push(options.filter);
        }

        const process = await this.#cmdOrSubprocess(args);
        const reader = process.stdout
            .pipeThrough(new DecodeUtf8Stream())
            .pipeThrough(new SplitStringStream("\n"))
            .getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            yield PackageManager.parsePackageListItem(value);
        }
    }

    async uninstall(
        packageName: string,
        options?: Partial<PackageManagerUninstallOptions>,
    ): Promise<void> {
        const args = buildArguments(
            ["pm", "uninstall"],
            options,
            PACKAGE_MANAGER_UNINSTALL_OPTIONS_MAP,
        );
        args.push(packageName);
        if (options?.splitNames) {
            args.push(...options.splitNames);
        }

        const process = await this.#cmdOrSubprocess(args);
        const output = await process.stdout
            .pipeThrough(new DecodeUtf8Stream())
            .pipeThrough(new ConcatStringStream())
            .then((output) => output.trim());
        if (output !== "Success") {
            throw new Error(output);
        }
    }

    async resolveActivity(
        options: PackageManagerResolveActivityOptions,
    ): Promise<string | undefined> {
        let args = buildArguments(
            ["pm", "resolve-activity", "--components"],
            options,
            PACKAGE_MANAGER_RESOLVE_ACTIVITY_OPTIONS_MAP,
        );

        args = args.concat(options.intent.build());

        const process = await this.#cmdOrSubprocess(args);
        const output = await process.stdout
            .pipeThrough(new DecodeUtf8Stream())
            .pipeThrough(new ConcatStringStream())
            .then((output) => output.trim());

        if (output === "No activity found") {
            return undefined;
        }

        return output;
    }

    /**
     * Creates a new install session.
     *
     * Install sessions are used to install apps with multiple splits, but it can also be used to install a single apk.
     *
     * Install sessions was added in Android 5.0 (API level 21).
     *
     * @param options Options for the install session
     * @returns ID of the new install session
     */
    async sessionCreate(options?: Partial<PackageManagerInstallOptions>) {
        const args = this.#buildInstallArguments("install-create", options);

        const process = await this.#cmdOrSubprocess(args);
        const output = await process.stdout
            .pipeThrough(new DecodeUtf8Stream())
            .pipeThrough(new ConcatStringStream())
            .then((output) => output.trim());

        const sessionIdString = output.match(/.*\[(\d+)\].*/);
        if (!sessionIdString) {
            throw new Error("Failed to create install session");
        }

        return Number.parseInt(sessionIdString[1]!, 10);
    }

    async sessionAddSplit(sessionId: number, splitName: string, path: string) {
        const args: string[] = [
            "pm",
            "install-write",
            sessionId.toString(),
            splitName,
            path,
        ];

        const output = await this.adb.subprocess
            .spawnAndWaitLegacy(args)
            .then((output) => output.trim());
        if (!output.startsWith("Success")) {
            throw new Error(output);
        }
    }

    async sessionAddSplitStream(
        sessionId: number,
        splitName: string,
        size: number,
        stream: ReadableStream<MaybeConsumable<Uint8Array>>,
    ) {
        const args: string[] = [
            "pm",
            "install-write",
            "-S",
            size.toString(),
            sessionId.toString(),
            splitName,
            "-",
        ];

        const process = await this.#cmdOrSubprocess(args);
        const output = process.stdout
            .pipeThrough(new DecodeUtf8Stream())
            .pipeThrough(new ConcatStringStream())
            .then((output) => output.trim());

        await Promise.all([
            stream.pipeTo(process.stdin),
            output.then((output) => {
                if (!output.startsWith("Success")) {
                    throw new Error(output);
                }
            }),
        ]);
    }

    async sessionCommit(sessionId: number) {
        const args: string[] = ["pm", "install-commit", sessionId.toString()];
        const output = await this.adb.subprocess
            .spawnAndWaitLegacy(args)
            .then((output) => output.trim());
        if (output !== "Success") {
            throw new Error(output);
        }
    }

    async sessionAbandon(sessionId: number) {
        const args: string[] = ["pm", "install-abandon", sessionId.toString()];
        const output = await this.adb.subprocess
            .spawnAndWaitLegacy(args)
            .then((output) => output.trim());
        if (output !== "Success") {
            throw new Error(output);
        }
    }
}

export class PackageManagerInstallSession {
    static async create(
        packageManager: PackageManager,
        options?: Partial<PackageManagerInstallOptions>,
    ) {
        const id = await packageManager.sessionCreate(options);
        return new PackageManagerInstallSession(packageManager, id);
    }

    #packageManager: PackageManager;

    #id: number;
    get id() {
        return this.#id;
    }

    constructor(packageManager: PackageManager, id: number) {
        this.#packageManager = packageManager;
        this.#id = id;
    }

    addSplit(splitName: string, path: string) {
        return this.#packageManager.sessionAddSplit(this.#id, splitName, path);
    }

    addSplitStream(
        splitName: string,
        size: number,
        stream: ReadableStream<MaybeConsumable<Uint8Array>>,
    ) {
        return this.#packageManager.sessionAddSplitStream(
            this.#id,
            splitName,
            size,
            stream,
        );
    }

    commit() {
        return this.#packageManager.sessionCommit(this.#id);
    }

    abandon() {
        return this.#packageManager.sessionAbandon(this.#id);
    }
}
