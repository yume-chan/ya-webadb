import "core-js/features/array/flat";
import "core-js/proposals/reflect-metadata";
import "rxjs";
import "zone.js";

import "@angular/compiler";

import "@fortawesome/fontawesome-free/css/brands.css";
import "@fortawesome/fontawesome-free/css/fontawesome.css";
import "@fortawesome/fontawesome-free/css/regular.css";
import "@fortawesome/fontawesome-free/css/solid.css";
import "source-code-pro/source-code-pro.css";
import "source-sans-pro/source-sans-pro.css";

import "../app/src/global.scss";
import "../app/src/preload.scss";
import "../app/src/toastr.scss";

import { ApplicationRef, NgModuleRef, enableProdMode } from "@angular/core";
import { enableDebugTools } from "@angular/platform-browser";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { Adb, AdbIncomingSocketHandler, AdbTransport } from "@yume-chan/adb";
import { PromiseResolver } from "@yume-chan/async";
import {
    UnwrapConsumableStream,
    WrapWritableStream,
    type Consumable,
    type ReadableStream,
    type WritableStream,
} from "@yume-chan/stream-extra";
import * as Comlink from "comlink";
import Yaml from "js-yaml";
import { Subject } from "rxjs";
import { BOOTSTRAP_DATA, BootstrapData } from "tabby-core";

import { getRootModule } from "../app/src/app.module";

import { AdbBanner } from "@yume-chan/adb/esm/banner";
import * as TabbyTango from "@yume-chan/tabby-tango";
import * as TabbyCommunityColorSchemes from "tabby-community-color-schemes";
import * as TabbyCore from "tabby-core";
import * as TabbySettings from "tabby-settings";
import * as TabbyTerminal from "tabby-terminal";
import * as TabbyWeb from "tabby-web";

interface BootstrapOptions {
    packageModules: any[];
    bootstrapData: BootstrapData;
    debugMode: boolean;
    connector: any;
}

export type ValueOrPromise<T> = T | PromiseLike<T>;

export interface AdbProxyTransportServer {
    disconnected: Promise<void>;

    connect(
        service: string,
        callback: (
            readable: ReadableStream<Uint8Array>,
            writable: WritableStream<Uint8Array>,
            close: () => ValueOrPromise<void>
        ) => void
    ): void;

    addReverseTunnel(
        handler: AdbIncomingSocketHandler,
        address: string
    ): ValueOrPromise<string>;

    removeReverseTunnel(address: string): ValueOrPromise<void>;

    clearReverseTunnels(): ValueOrPromise<void>;

    close(): ValueOrPromise<void>;
}

class AdbProxyTransport implements AdbTransport {
    private _port: MessagePort;
    private _remote: Comlink.Remote<AdbProxyTransportServer>;

    public readonly serial: string;
    public readonly maxPayloadSize: number;
    public readonly banner: AdbBanner;

    private _disconnected = new PromiseResolver<void>();
    public get disconnected(): Promise<void> {
        return this._disconnected.promise;
    }

    constructor(
        port: MessagePort,
        serial: string,
        maxPayloadSize: number,
        banner: AdbBanner
    ) {
        this._port = port;
        this._remote = Comlink.wrap(port);
        this._remote.disconnected.then(() => {
            this._disconnected.resolve();
        });

        this.serial = serial;
        this.maxPayloadSize = maxPayloadSize;
        this.banner = banner;
    }

    public async connect(service: string) {
        let readable: ReadableStream<Uint8Array>;
        let writable: WritableStream<Consumable<Uint8Array>>;
        let close: () => void;
        await this._remote.connect(
            service,
            Comlink.proxy((r, w, c) => {
                readable = r;
                writable = new WrapWritableStream(w).bePipedThroughFrom(
                    new UnwrapConsumableStream()
                );
                close = c;
            })
        );
        return {
            service,
            readable: readable!,
            writable: writable!,
            close: close!,
        };
    }

    public async addReverseTunnel(
        handler: AdbIncomingSocketHandler,
        address: string
    ) {
        return await this._remote.addReverseTunnel(handler, address);
    }

    public async removeReverseTunnel(address: string) {
        await this._remote.removeReverseTunnel(address);
    }

    public async clearReverseTunnels() {
        await this._remote.clearReverseTunnels();
    }

    public async close() {
        await this._remote.close();
        this._port.close();
    }
}

async function bootstrap(options: BootstrapOptions): Promise<NgModuleRef<any>> {
    const pluginModules = [];
    for (const packageModule of options.packageModules) {
        if (!packageModule.default) {
            continue;
        }
        const pluginModule = packageModule.default.forRoot
            ? packageModule.default.forRoot()
            : packageModule.default;
        pluginModule.pluginName = packageModule.pluginName;
        pluginModule.bootstrap = packageModule.bootstrap;
        pluginModules.push(pluginModule);
    }

    if (!options.debugMode) {
        enableProdMode();
    }

    const module = getRootModule(pluginModules);
    window["rootModule"] = module;

    const moduleRef = await platformBrowserDynamic([
        { provide: BOOTSTRAP_DATA, useValue: options.bootstrapData },
        { provide: "WEB_CONNECTOR", useValue: options.connector },
    ]).bootstrapModule(module);
    if (options.debugMode) {
        const applicationRef = moduleRef.injector.get(ApplicationRef);
        const componentRef = applicationRef.components[0];
        enableDebugTools(componentRef);
    }
    return moduleRef;
}

export class NotImplementedSocket {
    connect$ = new Subject<void>();
    data$ = new Subject<Buffer>();
    error$ = new Subject<Error>();
    close$ = new Subject<Buffer>();

    async connect() {
        this.error$.next(new Error("Socket is not implemented in Web"));
    }
}

// Usage of connector is scattered around the Tabby codebase,
// but these is all methods that are required.
class WebConnector {
    constructor() {}

    async loadConfig(): Promise<string> {
        let config;

        const text = localStorage.getItem("tabby-config");
        if (text) {
            config = Yaml.load(text);
        } else {
            config = {
                recoverTabs: false,
                web: {
                    preventAccidentalTabClosure: false,
                },
                terminal: {
                    fontSize: 11,
                },
            };
        }

        if (!config.providerBlacklist) {
            config.providerBlacklist = ["settings:ProfilesSettingsTabProvider"];
        } else if (
            !config.providerBlacklist.includes(
                "settings:ProfilesSettingsTabProvider"
            )
        ) {
            config.providerBlacklist.push(
                "settings:ProfilesSettingsTabProvider"
            );
        }

        if (!config.commandBlacklist) {
            config.commandBlacklist = ["core:profile-selector"];
        } else if (!config.commandBlacklist.includes("core:profile-selector")) {
            config.commandBlacklist.push("core:profile-selector");
        }

        return Yaml.dump(config);
    }

    async saveConfig(content: string): Promise<void> {
        localStorage.setItem("tabby-config", content);
    }

    getAppVersion(): string {
        return "1.0.197-nightly.1";
    }

    createSocket() {
        return new NotImplementedSocket();
    }
}

async function start() {
    const connector = new WebConnector();
    window["__connector__"] = connector;

    const pluginInfos: {
        pluginName: string;
        packageName: string;
        module: any;
    }[] = [
        {
            pluginName: "core",
            packageName: "tabby-core",
            module: TabbyCore,
        },
        {
            pluginName: "settings",
            packageName: "tabby-settings",
            module: TabbySettings,
        },
        {
            pluginName: "terminal",
            packageName: "tabby-terminal",
            module: TabbyTerminal,
        },
        {
            pluginName: "community-color-schemes",
            packageName: "tabby-community-color-schemes",
            module: TabbyCommunityColorSchemes,
        },
        {
            pluginName: "web",
            packageName: "tabby-web",
            module: TabbyWeb,
        },
        {
            pluginName: "tango",
            packageName: "@yume-chan/tabby-tango",
            module: TabbyTango,
        },
    ];

    window.addEventListener("message", ({ data }) => {
        if (
            typeof data === "object" &&
            "type" in data &&
            data.type === "adb-connect"
        ) {
            const { port, serial, maxPayloadSize, banner } = data;
            const transport = new AdbProxyTransport(
                port,
                serial,
                maxPayloadSize,
                banner
            );
            TabbyTango.AdbState.value = new Adb(transport);
        }
    });
    window.parent.postMessage("adb-ready", "*");

    const pluginModules = [];
    for (const info of pluginInfos) {
        info.module!.pluginName = info.pluginName;
        pluginModules.push(info.module);
    }

    window["pluginModules"] = pluginModules.map((plugin) => {
        if ("default" in plugin) {
            plugin.default.pluginName = plugin.pluginName;
            return plugin.default;
        }
        return plugin;
    });

    const config = connector.loadConfig();
    await bootstrap({
        packageModules: pluginModules,
        bootstrapData: {
            config,
            executable: "web",
            isMainWindow: true,
            windowID: 1,
            installedPlugins: [],
            userPluginsPath: "/",
        },
        debugMode: true,
        connector,
    });
}

start();
