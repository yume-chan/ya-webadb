// cspell:ignore dont
// cspell:ignore instantapp
// cspell:ignore apks
// cspell:ignore versioncode
// cspell:ignore dexopt

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
import { buildCommand } from "./utils.js";

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

interface OptionDefinition<T> {
    type: T;
    name: string;
    minApiLevel?: number;
    maxApiLevel?: number;
}

function option<T>(
    name: string,
    minApiLevel?: number,
    maxApiLevel?: number,
): OptionDefinition<T> {
    return {
        name,
        minApiLevel,
        maxApiLevel,
    } as OptionDefinition<T>;
}

// https://cs.android.com/android/platform/superproject/+/master:frameworks/base/services/core/java/com/android/server/pm/PackageManagerShellCommand.java;l=3046;drc=6d14d35d0241f6fee145f8e54ffd77252e8d29fd
export const PackageManagerInstallOptions = {
    forwardLock: option<boolean>("-l", undefined, 28),
    replaceExisting: option<boolean>("-r", undefined, 27),
    skipExisting: option<boolean>("-R", 28),
    installerPackageName: option<string>("-i"),
    allowTest: option<boolean>("-t"),
    externalStorage: option<boolean>("-s", undefined, 28),
    internalStorage: option<boolean>("-f"),
    requestDowngrade: option<boolean>("-d"),
    grantRuntimePermissions: option<boolean>("-g", 23),
    restrictPermissions: option<boolean>("--restrict-permissions", 29),
    doNotKill: option<boolean>("--dont-kill"),
    originatingUri: option<string>("--originating-uri"),
    refererUri: option<string>("--referrer"),
    inheritFrom: option<string>("-p", 24),
    packageName: option<string>("--pkg", 28),
    abi: option<string>("--abi", 21),
    instantApp: option<boolean>("--ephemeral", 24),
    full: option<boolean>("--full", 26),
    preload: option<boolean>("--preload", 28),
    user: option<SingleUserOrAll>("--user", 21),
    installLocation: option<PackageManagerInstallLocation>(
        "--install-location",
        24,
    ),
    installReason: option<PackageManagerInstallReason>("--install-reason", 29),
    updateOwnership: option<boolean>("--update-ownership", 34),
    forceUuid: option<string>("--force-uuid", 24),
    forceSdk: option<number>("--force-sdk", 24),
    apex: option<boolean>("--apex", 29),
    forceNonStaged: option<boolean>("--force-non-staged", 31),
    multiPackage: option<boolean>("--multi-package", 29),
    staged: option<boolean>("--staged", 29),
    nonStaged: option<boolean>("--non-staged", 35),
    forceQueryable: option<boolean>("--force-queryable", 30),
    enableRollback: option<boolean | number>("--enable-rollback", 29),
    rollbackImpactLevel: option<number>("--rollback-impact-level", 35),
    wait: option<boolean | number>("--wait", 30, 30),
    noWait: option<boolean>("--no-wait", 30, 30),
    stagedReadyTimeout: option<number>("--staged-ready-timeout", 31),
    skipVerification: option<boolean>("--skip-verification", 30),
    skipEnable: option<boolean>("--skip-enable", 34),
    bypassLowTargetSdkBlock: option<boolean>(
        "--bypass-low-target-sdk-block",
        34,
    ),
    ignoreDexoptProfile: option<boolean>("--ignore-dexopt-profile", 35),
    packageSource: option<number>("--package-source", 35),
    dexoptCompilerFilter: option<string>("--dexopt-compiler-filter", 35),
    disableAutoInstallDependencies: option<boolean>(
        "--disable-auto-install-dependencies",
        36,
    ),
} as const;

export type PackageManagerInstallOptions = {
    [K in keyof typeof PackageManagerInstallOptions]?:
        | (typeof PackageManagerInstallOptions)[K]["type"]
        | undefined;
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

function buildInstallCommand(
    command: string,
    options: PackageManagerInstallOptions | undefined,
    apiLevel: number | undefined,
): string[] {
    const args = [PackageManager.ServiceName, command];

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

    if (!options) {
        return args;
    }

    for (const [key, value] of Object.entries(options)) {
        if (value === undefined || value === null) {
            continue;
        }

        const option =
            PackageManagerInstallOptions[
                key as keyof PackageManagerInstallOptions
            ];

        if (option === undefined) {
            continue;
        }

        if (apiLevel !== undefined) {
            if (
                option.minApiLevel !== undefined &&
                apiLevel < option.minApiLevel
            ) {
                continue;
            }
            if (
                option.maxApiLevel !== undefined &&
                apiLevel > option.maxApiLevel
            ) {
                continue;
            }
        }

        switch (typeof value) {
            case "boolean":
                if (value) {
                    args.push(option.name);
                }
                break;
            case "number":
                args.push(option.name, value.toString());
                break;
            case "string":
                args.push(option.name, escapeArg(value));
                break;
            default:
                throw new Error(
                    `Unsupported type for option ${key}: ${typeof value}`,
                );
        }
    }

    return args;
}

export class PackageManager extends AdbServiceBase {
    static readonly ServiceName = "package";
    static readonly CommandName = "pm";

    #apiLevel: number | undefined;
    #cmd: Cmd.NoneProtocolService;

    constructor(adb: Adb, apiLevel?: number) {
        super(adb);

        this.#apiLevel = apiLevel;
        this.#cmd = Cmd.createNoneProtocol(adb, PackageManager.CommandName);
    }

    /**
     * Install the apk file.
     *
     * @param apks Path to the apk file. It must exist on the device. On Android 10 and lower, only one apk can be specified.
     */
    async install(
        apks: readonly string[],
        options?: PackageManagerInstallOptions,
    ): Promise<void> {
        const command = buildInstallCommand("install", options, this.#apiLevel);

        command[0] = PackageManager.CommandName;

        // WIP: old version of pm doesn't support multiple apks
        for (const apk of apks) {
            // `install` only uses `pm` so escape the arguments here
            command.push(escapeArg(apk));
        }

        // Starting from Android 7, `pm` becomes a wrapper to `cmd package`.
        // The benefit of `cmd package` is it starts faster than the old `pm`,
        // because it connects to the already running `system` process,
        // instead of initializing all system components from scratch.
        //
        // But `cmd` executable can't read files in `/data/local/tmp`
        // (and many other places) due to SELinux policies,
        // so installing from files must still use `pm`.
        // (the starting executable file decides which SELinux policies to apply)
        const output = await this.adb.subprocess.noneProtocol
            .spawn(command)
            .wait()
            .toString()
            .then((output) => output.trim());

        if (output !== "Success") {
            throw new Error(output);
        }
    }

    async pushAndInstallStream(
        stream: ReadableStream<MaybeConsumable<Uint8Array>>,
        options?: PackageManagerInstallOptions,
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
        options?: PackageManagerInstallOptions,
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

        const command = buildInstallCommand("install", options, this.#apiLevel);
        command.push("-S", size.toString());
        const process = await this.#cmd.spawn(command);

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
        const command = buildCommand(
            ["package", "list", "packages"],
            options,
            PACKAGE_MANAGER_LIST_PACKAGES_OPTIONS_MAP,
        );

        if (options?.filter) {
            command.push(options.filter);
        }

        const process = await this.#cmd.spawn(command);

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
     * @param options The user ID to query
     * @returns An array of APK file paths
     */
    async getPackageSources(
        packageName: string,
        options?: {
            /**
             * The user ID to query
             */
            user?: number | undefined;
        },
    ): Promise<string[]> {
        // `pm path` and `pm -p` are the same,
        // but `pm path` allows an optional `--user` option.
        const command = [PackageManager.ServiceName, "path"];

        if (options?.user !== undefined) {
            command.push("--user", options.user.toString());
        }

        command.push(packageName);

        // `cmd package` doesn't support `path` command on Android 7 and 8.
        let process: AdbNoneProtocolProcess;
        if (this.#apiLevel !== undefined && this.#apiLevel <= 27) {
            command[0] = PackageManager.CommandName;
            process = await this.adb.subprocess.noneProtocol.spawn(
                command.map(escapeArg),
            );
        } else {
            process = await this.#cmd.spawn(command);
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
        const command = buildCommand(
            [PackageManager.ServiceName, "uninstall"],
            options,
            PACKAGE_MANAGER_UNINSTALL_OPTIONS_MAP,
        );

        command.push(packageName);

        if (options?.splitNames) {
            for (const splitName of options.splitNames) {
                command.push(splitName);
            }
        }

        const output = await this.#cmd
            .spawn(command)
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
        const command = buildCommand(
            [PackageManager.ServiceName, "resolve-activity", "--components"],
            options,
            PACKAGE_MANAGER_RESOLVE_ACTIVITY_OPTIONS_MAP,
        );

        for (const arg of options.intent.build()) {
            command.push(arg);
        }

        const output = await this.#cmd
            .spawn(command)
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
        options?: PackageManagerInstallOptions,
    ): Promise<number> {
        const command = buildInstallCommand(
            "install-create",
            options,
            this.#apiLevel,
        );

        const output = await this.#cmd
            .spawn(command)
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
        const command: string[] = [
            PackageManager.CommandName,
            "install-write",
            sessionId.toString(),
            // `install-write` only uses `pm` so escape the arguments here
            escapeArg(splitName),
            escapeArg(path),
        ];

        // Similar to `install`, must use `adb.subprocess` so it can read `path`
        const process = await this.adb.subprocess.noneProtocol.spawn(command);
        await this.checkResult(process.output);
    }

    async sessionAddSplitStream(
        sessionId: number,
        splitName: string,
        size: number,
        stream: ReadableStream<MaybeConsumable<Uint8Array>>,
    ): Promise<void> {
        const command: string[] = [
            PackageManager.ServiceName,
            "install-write",
            "-S",
            size.toString(),
            sessionId.toString(),
            splitName,
            "-",
        ];

        const process = await this.#cmd.spawn(command);
        await Promise.all([
            stream.pipeTo(process.stdin),
            this.checkResult(process.output),
        ]);
    }

    /**
     * Commit an install session.
     * @param sessionId ID of install session returned by `createSession`
     * @returns A `Promise` that resolves when the session is committed
     */
    async sessionCommit(sessionId: number): Promise<void> {
        const command: string[] = [
            PackageManager.ServiceName,
            "install-commit",
            sessionId.toString(),
        ];

        // `cmd package` does support `install-commit` command on Android 7,
        // but the "Success" message is not forwarded back to the client,
        // causing this function to fail with an empty message.
        let process: AdbNoneProtocolProcess;
        if (this.#apiLevel !== undefined && this.#apiLevel <= 25) {
            command[0] = PackageManager.CommandName;
            process = await this.adb.subprocess.noneProtocol.spawn(command);
        } else {
            process = await this.#cmd.spawn(command);
        }

        await this.checkResult(process.output);
    }

    async sessionAbandon(sessionId: number): Promise<void> {
        const command: string[] = [
            PackageManager.ServiceName,
            "install-abandon",
            sessionId.toString(),
        ];
        const process = await this.#cmd.spawn(command);
        await this.checkResult(process.output);
    }
}

export class PackageManagerInstallSession {
    static async create(
        packageManager: PackageManager,
        options?: PackageManagerInstallOptions,
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
     * @returns A `Promise` that resolves when the session is committed
     */
    commit(): Promise<void> {
        return this.#packageManager.sessionCommit(this.#id);
    }

    abandon(): Promise<void> {
        return this.#packageManager.sessionAbandon(this.#id);
    }
}
