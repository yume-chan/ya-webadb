// cspell:ignore dont
// cspell:ignore instantapp
// cspell:ignore apks
// cspell:ignore versioncode

import type { Adb } from "@yume-chan/adb";
import { AdbServiceBase } from "@yume-chan/adb";
import type { MaybeConsumable, ReadableStream } from "@yume-chan/stream-extra";
import {
    ConcatStringStream,
    SplitStringStream,
    TextDecoderStream,
} from "@yume-chan/stream-extra";

import { CmdNoneProtocolService } from "./cmd.js";
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
    options: Partial<PackageManagerInstallOptions> | undefined,
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

export class PackageManager extends AdbServiceBase {
    static ServiceName = "package";
    static CommandName = "pm";

    #cmd: CmdNoneProtocolService;

    constructor(adb: Adb) {
        super(adb);
        this.#cmd = new CmdNoneProtocolService(adb, PackageManager.CommandName);
    }

    /**
     * Install the apk file.
     *
     * @param apks Path to the apk file. It must exist on the device. On Android 10 and lower, only one apk can be specified.
     */
    async install(
        apks: readonly string[],
        options?: Partial<PackageManagerInstallOptions>,
    ): Promise<string> {
        const args = buildInstallArguments("install", options);
        args[0] = PackageManager.CommandName;
        // WIP: old version of pm doesn't support multiple apks
        args.push(...apks);

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
            .spawnWaitText(args)
            .then((output) => output.trim());

        if (output !== "Success") {
            throw new Error(output);
        }

        return output;
    }

    async pushAndInstallStream(
        stream: ReadableStream<MaybeConsumable<Uint8Array>>,
        options?: Partial<PackageManagerInstallOptions>,
    ): Promise<string> {
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
            return await this.install([filePath], options);
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
        // It's hard to detect whether `pm` supports streaming install (unless actually trying),
        // so check for whether `cmd` is supported,
        // and assume `pm` streaming install support status is same as that.
        if (!this.#cmd.isSupported) {
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

    static parsePackageListItem(
        line: string,
    ): PackageManagerListPackagesResult {
        line = line.substring("package:".length);

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
        options?: Partial<PackageManagerListPackagesOptions>,
    ): AsyncGenerator<PackageManagerListPackagesResult, void, void> {
        const args = buildArguments(
            ["package", "list", "packages"],
            options,
            PACKAGE_MANAGER_LIST_PACKAGES_OPTIONS_MAP,
        );
        if (options?.filter) {
            args.push(options.filter);
        }

        const process = await this.#cmd.spawn(args);
        const reader = process.output
            .pipeThrough(new TextDecoderStream())
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

    async getPackageSources(packageName: string): Promise<string[]> {
        const args = [PackageManager.ServiceName, "-p", packageName];
        const process = await this.#cmd.spawn(args);
        const result: string[] = [];
        for await (const line of process.output
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(new SplitStringStream("\n"))) {
            if (line.startsWith("package:")) {
                result.push(line.substring("package:".length));
            }
        }

        return result;
    }

    async uninstall(
        packageName: string,
        options?: Partial<PackageManagerUninstallOptions>,
    ): Promise<void> {
        const args = buildArguments(
            [PackageManager.ServiceName, "uninstall"],
            options,
            PACKAGE_MANAGER_UNINSTALL_OPTIONS_MAP,
        );
        args.push(packageName);
        if (options?.splitNames) {
            args.push(...options.splitNames);
        }

        const output = await this.#cmd
            .spawnWaitText(args)
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

        args = args.concat(options.intent.build());

        const output = await this.#cmd
            .spawnWaitText(args)
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
        options?: Partial<PackageManagerInstallOptions>,
    ): Promise<number> {
        const args = buildInstallArguments("install-create", options);

        const output = await this.#cmd
            .spawnWaitText(args)
            .then((output) => output.trim());

        const sessionIdString = output.match(/.*\[(\d+)\].*/);
        if (!sessionIdString) {
            throw new Error("Failed to create install session");
        }

        return Number.parseInt(sessionIdString[1]!, 10);
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
            "pm",
            "install-write",
            sessionId.toString(),
            splitName,
            path,
        ];

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
            splitName,
            "-",
        ];

        const process = await this.#cmd.spawn(args);
        await Promise.all([
            stream.pipeTo(process.stdin),
            this.checkResult(process.output),
        ]);
    }

    async sessionCommit(sessionId: number): Promise<void> {
        const args: string[] = [
            PackageManager.ServiceName,
            "install-commit",
            sessionId.toString(),
        ];
        const process = await this.#cmd.spawn(args);
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

export class PackageManagerInstallSession {
    static async create(
        packageManager: PackageManager,
        options?: Partial<PackageManagerInstallOptions>,
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

    commit(): Promise<void> {
        return this.#packageManager.sessionCommit(this.#id);
    }

    abandon(): Promise<void> {
        return this.#packageManager.sessionAbandon(this.#id);
    }
}
