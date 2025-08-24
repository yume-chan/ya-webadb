// cspell:ignore dont
// cspell:ignore instantapp
// cspell:ignore apks
// cspell:ignore versioncode

import type { Adb, AdbNoneProtocolProcess } from "@yume-chan/adb";
import { AdbServiceBase, escapeArg } from "@yume-chan/adb";
import type { MaybeConsumable, ReadableStream } from "@yume-chan/stream-extra";
import {
    ConcatStringStream,
    SplitStringStream,
    TextDecoderStream,
} from "@yume-chan/stream-extra";

import { Cmd } from "./cmd/index.js";
import type { IntentBuilder } from "./intent.js";
import type { Optional, SingleUserOrAll } from "./utils.js";
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
    splitNames: readonly string[];
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

function buildInstallArguments(
    command: string,
    options: Optional<PackageManagerInstallOptions> | undefined,
): string[] {
    const args = buildArguments(
        [PackageManager.ServiceName, command],
        options,
        PACKAGE_MANAGER_INSTALL_OPTIONS_MAP,
    );
    if (!options?.skipExisting) {
        /*
         * | behavior             | previous version     | modern version       |
         * | -------------------- | -------------------- | -------------------- |
         * | replace existing app | requires `-r`        | default behavior [1] |
         * | skip existing app    | default behavior [2] | requires `-R`        |
         *
         * [1]: `-r` recognized but ignored
         * [2]: `-R` not recognized but ignored
         *
         * So add `-r` when `skipExisting` is `false` for compatibility.
         */
        args.push("-r");
    }
    return args;
}

function shouldUsePm(
    options: PackageManager.UsePmOptions | undefined,
    maxApiLevel: number,
) {
    if (options) {
        if (options.usePm) {
            return true;
        } else if (
            options.apiLevel !== undefined &&
            options.apiLevel <= maxApiLevel
        ) {
            return true;
        }
    }

    return false;
}

export class PackageManager extends AdbServiceBase {
    static readonly ServiceName = "package";
    static readonly CommandName = "pm";

    #cmd: Cmd.NoneProtocolService;

    constructor(adb: Adb) {
        super(adb);
        this.#cmd = Cmd.createNoneProtocol(adb, PackageManager.CommandName);
    }

    /**
     * Install the apk file.
     *
     * @param apks Path to the apk file. It must exist on the device. On Android 10 and lower, only one apk can be specified.
     */
    async install(
        apks: readonly string[],
        options?: Optional<PackageManagerInstallOptions>,
    ): Promise<void> {
        const args = buildInstallArguments("install", options);
        args[0] = PackageManager.CommandName;
        // WIP: old version of pm doesn't support multiple apks
        args.push(...apks.map(escapeArg));

        // Starting from Android 7, `pm` becomes a wrapper to `cmd package`.
        // The benefit of `cmd package` is it starts faster than the old `pm`,
        // because it connects to the already running `system` process,
        // instead of initializing all system components from scratch.
        //
        // But launching `cmd package` directly causes it to not be able to
        // read files in `/data/local/tmp` (and many other places) due to SELinux policies,
        // so installing files must still use `pm`.
        // (the starting executable file decides which SELinux policies to apply)
        const output = await this.adb.subprocess.noneProtocol
            .spawn(args)
            .wait()
            .toString()
            .then((output) => output.trim());

        if (output !== "Success") {
            throw new Error(output);
        }
    }

    async pushAndInstallStream(
        stream: ReadableStream<MaybeConsumable<Uint8Array>>,
        options?: Optional<PackageManagerInstallOptions>,
    ): Promise<void> {
        const fileName = Math.random().toString().substring(2);
        const filePath = `/data/local/tmp/${fileName}.apk`;

        const sync = await this.adb.sync();

        try {
            await sync.write({
                filename: filePath,
                file: stream,
            });
        } finally {
            await sync.dispose();
        }

        try {
            await this.install([filePath], options);
        } finally {
            await this.adb.rm(filePath);
        }
    }

    async installStream(
        size: number,
        stream: ReadableStream<MaybeConsumable<Uint8Array>>,
        options?: Optional<PackageManagerInstallOptions>,
    ): Promise<void> {
        // Technically `cmd` support and streaming install support are unrelated,
        // but it's impossible to detect streaming install support without actually trying it.
        // As they are both added in Android 7,
        // assume `cmd` support also means streaming install support (and vice versa).
        if (this.#cmd.mode === Cmd.Mode.Fallback) {
            // Fall back to push file then install
            await this.pushAndInstallStream(stream, options);
            return;
        }

        const args = buildInstallArguments("install", options);
        args.push("-S", size.toString());
        const process = await this.#cmd.spawn(args);

        const output = process.output
            .pipeThrough(new TextDecoderStream())
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

    static readonly PackageListItemPrefix = "package:";

    static parsePackageListItem(
        line: string,
    ): PackageManagerListPackagesResult {
        line = line.substring(PackageManager.PackageListItemPrefix.length);

        let packageName: string;
        let sourceDir: string | undefined;
        let versionCode: number | undefined;
        let installer: string | undefined;
        let uid: number | undefined;

        // The output format is easier to parse in backwards
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

        // `sourceDir` may contain `=` characters
        // (because in newer Android versions it's a base64 string of encrypted package name),
        // so use `lastIndexOf`
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

    async *listPackages(
        options?: Optional<PackageManagerListPackagesOptions>,
    ): AsyncGenerator<PackageManagerListPackagesResult, void, void> {
        const args = buildArguments(
            ["package", "list", "packages"],
            options,
            PACKAGE_MANAGER_LIST_PACKAGES_OPTIONS_MAP,
        );
        // `PACKAGE_MANAGER_LIST_PACKAGES_OPTIONS_MAP` doesn't have `filter`
        if (options?.filter) {
            args.push(escapeArg(options.filter));
        }

        const process = await this.#cmd.spawn(args);

        const output = process.output
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(new SplitStringStream("\n", { trim: true }));

        for await (const line of output) {
            if (!line.startsWith(PackageManager.PackageListItemPrefix)) {
                continue;
            }

            yield PackageManager.parsePackageListItem(line);
        }
    }

    /**
     * Gets APK file paths for a package.
     *
     * On supported Android versions, all split APKs are included.
     * @param packageName The package name to query
     * @param options
     * Whether to use `pm path` instead of `cmd package path`.
     *
     * `cmd package` is supported on Android 7,
     * but `cmd package path` is not supported until Android 9.
     *
     * See {@link PackageManager.UsePmOptions} for details
     * @returns An array of APK file paths
     */
    async getPackageSources(
        packageName: string,
        options?: {
            /**
             * The user ID to query
             */
            user?: number | undefined;
        } & PackageManager.UsePmOptions,
    ): Promise<string[]> {
        const args = [PackageManager.ServiceName, "path"];
        if (options?.user !== undefined) {
            args.push("--user", options.user.toString());
        }
        args.push(escapeArg(packageName));

        let process: AdbNoneProtocolProcess;
        if (shouldUsePm(options, 27)) {
            args[0] = PackageManager.CommandName;
            process = await this.adb.subprocess.noneProtocol.spawn(args);
        } else {
            process = await this.#cmd.spawn(args);
        }

        const lines = process.output
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(new SplitStringStream("\n", { trim: true }));

        const result: string[] = [];
        for await (const line of lines) {
            if (!line.startsWith(PackageManager.PackageListItemPrefix)) {
                continue;
            }

            result.push(
                line.substring(PackageManager.PackageListItemPrefix.length),
            );
        }

        return result;
    }

    async uninstall(
        packageName: string,
        options?: Optional<PackageManagerUninstallOptions>,
    ): Promise<void> {
        let args = buildArguments(
            [PackageManager.ServiceName, "uninstall"],
            options,
            PACKAGE_MANAGER_UNINSTALL_OPTIONS_MAP,
        );
        args.push(escapeArg(packageName));
        if (options?.splitNames) {
            args = args.concat(options.splitNames.map(escapeArg));
        }

        const output = await this.#cmd
            .spawn(args)
            .wait()
            .toString()
            .then((output) => output.trim());
        if (output !== "Success") {
            throw new Error(output);
        }
    }

    async resolveActivity(
        options: PackageManagerResolveActivityOptions,
    ): Promise<string | undefined> {
        let args = buildArguments(
            [PackageManager.ServiceName, "resolve-activity", "--components"],
            options,
            PACKAGE_MANAGER_RESOLVE_ACTIVITY_OPTIONS_MAP,
        );

        args = args.concat(options.intent.build().map(escapeArg));

        const output = await this.#cmd
            .spawn(args)
            .wait()
            .toString()
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
    async sessionCreate(
        options?: Optional<PackageManagerInstallOptions>,
    ): Promise<number> {
        const args = buildInstallArguments("install-create", options);

        const output = await this.#cmd
            .spawn(args)
            .wait()
            .toString()
            .then((output) => output.trim());

        // The output format won't change to make it easier to parse
        // https://cs.android.com/android/platform/superproject/+/android-latest-release:frameworks/base/services/core/java/com/android/server/pm/PackageManagerShellCommand.java;l=1744;drc=e38fa24e5738513d721ec2d9fd2dd00f32e327c1
        const match = output.match(/\[(\d+)\]/);
        if (!match) {
            throw new Error(output);
        }

        return Number.parseInt(match[1]!, 10);
    }

    async checkResult(stream: ReadableStream<Uint8Array>) {
        const output = await stream
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(new ConcatStringStream())
            .then((output) => output.trim());

        if (!output.startsWith("Success")) {
            throw new Error(output);
        }
    }

    async sessionAddSplit(
        sessionId: number,
        splitName: string,
        path: string,
    ): Promise<void> {
        const args: string[] = [
            PackageManager.CommandName,
            "install-write",
            sessionId.toString(),
            escapeArg(splitName),
            escapeArg(path),
        ];

        // Similar to `install`, must use `adb.subprocess` so it can read `path`
        const process = await this.adb.subprocess.noneProtocol.spawn(args);
        await this.checkResult(process.output);
    }

    async sessionAddSplitStream(
        sessionId: number,
        splitName: string,
        size: number,
        stream: ReadableStream<MaybeConsumable<Uint8Array>>,
    ): Promise<void> {
        const args: string[] = [
            PackageManager.ServiceName,
            "install-write",
            "-S",
            size.toString(),
            sessionId.toString(),
            escapeArg(splitName),
            "-",
        ];

        const process = await this.#cmd.spawn(args);
        await Promise.all([
            stream.pipeTo(process.stdin),
            this.checkResult(process.output),
        ]);
    }

    /**
     * Commit an install session.
     * @param sessionId ID of install session returned by `createSession`
     * @param options
     * Whether to use `pm install-commit` instead of `cmd package install-commit`.
     *
     * On Android 7, `cmd package install-commit` is supported,
     * but the "Success" message is not forwarded back to the client,
     * causing this function to fail with an empty message.
     *
     * https://cs.android.com/android/_/android/platform/frameworks/base/+/b6e96e52e379927859e82606c5b041d99f36a29e
     * @returns A `Promise` that resolves when the session is committed
     */
    async sessionCommit(
        sessionId: number,
        options?: PackageManager.UsePmOptions,
    ): Promise<void> {
        const args: string[] = [
            PackageManager.ServiceName,
            "install-commit",
            sessionId.toString(),
        ];

        let process: AdbNoneProtocolProcess;
        if (shouldUsePm(options, 25)) {
            args[0] = PackageManager.CommandName;
            process = await this.adb.subprocess.noneProtocol.spawn(args);
        } else {
            process = await this.#cmd.spawn(args);
        }

        await this.checkResult(process.output);
    }

    async sessionAbandon(sessionId: number): Promise<void> {
        const args: string[] = [
            PackageManager.ServiceName,
            "install-abandon",
            sessionId.toString(),
        ];
        const process = await this.#cmd.spawn(args);
        await this.checkResult(process.output);
    }
}

export namespace PackageManager {
    /**
     * `PackageManager` wrapper supports multiple methods to run commands:
     *
     *    * `pm` executable: Run traditional `pm` executable,
     *       which needs to initialize the whole Android framework each time it starts.
     *    * `cmd` executable: Run `cmd` executable,
     *      which sends arguments directly to the running `system` process.
     *    * `abb`: Use ADB abb command, which is similar to `cmd` executable,
     *      but uses a daemon process instead of starting a new process every time.
     *
     * `cmd` and `abb` modes are faster, so they are preferred when supported.
     * However, in older versions of Android, they don't support all commands,
     * or have bugs that make them unsafe to use.
     *
     * These options allows you to force using `pm` even if `cmd` or `abb` modes are supported.
     *
     * See each command's documentation for details.
     */
    export interface UsePmOptions {
        /**
         * When `true`, always use `pm`, even if `cmd` or `abb` modes are supported.
         *
         * Overrides {@link apiLevel}.
         */
        usePm?: boolean | undefined;
        /**
         * API Level of the device.
         *
         * When provided, each command will determine whether `pm` should be used
         * based on hardcoded API level checks.
         */
        apiLevel?: number | undefined;
    }
}

export class PackageManagerInstallSession {
    static async create(
        packageManager: PackageManager,
        options?: Optional<PackageManagerInstallOptions>,
    ): Promise<PackageManagerInstallSession> {
        const id = await packageManager.sessionCreate(options);
        return new PackageManagerInstallSession(packageManager, id);
    }

    #packageManager: PackageManager;

    #id: number;
    get id(): number {
        return this.#id;
    }

    constructor(packageManager: PackageManager, id: number) {
        this.#packageManager = packageManager;
        this.#id = id;
    }

    addSplit(splitName: string, path: string): Promise<void> {
        return this.#packageManager.sessionAddSplit(this.#id, splitName, path);
    }

    addSplitStream(
        splitName: string,
        size: number,
        stream: ReadableStream<MaybeConsumable<Uint8Array>>,
    ): Promise<void> {
        return this.#packageManager.sessionAddSplitStream(
            this.#id,
            splitName,
            size,
            stream,
        );
    }

    /**
     * Commit this install session.
     * @param options
     * Whether to use `pm install-commit` instead of `cmd package install-commit`.
     *
     * See {@link PackageManager.sessionCommit} for details
     * @returns A `Promise` that resolves when the session is committed
     */
    commit(options?: PackageManager.UsePmOptions): Promise<void> {
        return this.#packageManager.sessionCommit(this.#id, options);
    }

    abandon(): Promise<void> {
        return this.#packageManager.sessionAbandon(this.#id);
    }
}
