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
import { Adb } from "@yume-chan/adb";
import {
    AdbProxyBackend,
    AdbProxyServerInfo,
} from "@yume-chan/adb-backend-proxy";
import Yaml from "js-yaml";
import { Subject } from "rxjs";
import { BOOTSTRAP_DATA, BootstrapData } from "tabby-core";

import { getRootModule } from "../app/src/app.module";

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

    window.addEventListener("message", (e) => {
        if (
            typeof e.data === "object" &&
            "type" in e.data &&
            e.data.type === "adb"
        ) {
            const { port, version, maxPayloadSize, banner } =
                e.data as AdbProxyServerInfo;
            const backend = new AdbProxyBackend(port);
            const connection = backend.connect();
            TabbyTango.AdbState.value = new Adb(
                connection,
                version,
                maxPayloadSize,
                banner
            );
        }
    });
    window.parent.postMessage("adb", "*");

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
