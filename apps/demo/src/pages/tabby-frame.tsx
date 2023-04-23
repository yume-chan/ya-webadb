import { Adb } from "@yume-chan/adb";
import {
    AdbProxyBackend,
    AdbProxyServerInfo,
} from "@yume-chan/adb-backend-proxy";
import { useEffect } from "react";
import { Subject } from "rxjs";
import Yaml from "yaml";

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
            config = Yaml.parse(text);
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

        config.providerBlacklist = [
            ...(config.providerBlacklist ?? []),
            "settings:ProfilesSettingsTabProvider",
        ];
        config.commandBlacklist = [
            ...(config.commandBlacklist ?? []),
            "core:profile-selector",
        ];

        return Yaml.stringify(config);
    }

    async saveConfig(content: string): Promise<void> {
        localStorage.setItem("tabby-config", content);
    }

    getAppVersion(): string {
        return "1.0.197-nightly.0";
    }

    createSocket() {
        return new NotImplementedSocket();
    }
}

interface TabbyWeb {
    registerPluginModule(packageName: string, exports: unknown): void;
    bootstrap(options: unknown): Promise<void>;
}

interface TabbyPluginModule {
    pluginName: string;
}

interface GlobalExtension {
    __connector__: WebConnector | undefined;
    module: any;
    exports: any;
    Tabby: TabbyWeb;
    pluginModules: TabbyPluginModule[];
}

const globalExtension = globalThis as unknown as GlobalExtension;

async function start() {
    const connector = new WebConnector();
    globalExtension["__connector__"] = connector;

    await import("@angular/compiler");
    // @ts-expect-error
    await import("tabby-web-container/dist/preload.mjs");
    // @ts-expect-error
    await import("tabby-web-container/dist/bundle.js");

    async function webRequire(url: string | URL) {
        if (typeof url === "object") {
            url = url.toString();
        }

        console.log(`Loading ${url}`);
        const e = document.createElement("script");
        globalExtension["module"] = { exports: {} };
        globalExtension["exports"] = globalExtension["module"].exports;
        await new Promise((resolve) => {
            e.onload = resolve;
            e.src = url as string;
            document.head.appendChild(e);
        });
        return globalExtension["module"].exports;
    }

    async function prefetchURL(url: string | URL) {
        await (await fetch(url)).text();
    }

    const tabby = globalExtension.Tabby;

    const pluginInfos: {
        pluginName: string;
        packageName: string;
        url: URL;
    }[] = [
        {
            pluginName: "core",
            packageName: "tabby-core",
            url: new URL("tabby-core/dist/index.js", import.meta.url),
        },
        {
            pluginName: "settings",
            packageName: "tabby-settings",
            url: new URL("tabby-settings/dist/index.js", import.meta.url),
        },
        {
            pluginName: "terminal",
            packageName: "tabby-terminal",
            url: new URL("tabby-terminal/dist/index.js", import.meta.url),
        },
        {
            pluginName: "community-color-schemes",
            packageName: "tabby-community-color-schemes",
            url: new URL(
                "tabby-community-color-schemes/dist/index.js",
                import.meta.url
            ),
        },
        {
            pluginName: "web",
            packageName: "tabby-web",
            url: new URL("tabby-web/dist/index.js", import.meta.url),
        },
    ];

    await Promise.all(
        pluginInfos.map((pluginInfo) => prefetchURL(pluginInfo.url))
    );

    const pluginModules = [];
    for (const info of pluginInfos) {
        const result = await webRequire(info.url);
        result.pluginName = info.pluginName;
        tabby.registerPluginModule(info.packageName, result);
        pluginModules.push(result);
    }

    const TabbyTango = await webRequire(
        new URL("@yume-chan/tabby-tango/dist/index.js", import.meta.url)
    );
    TabbyTango.pluginName = "tango";

    window.addEventListener("message", (e) => {
        if ("type" in e.data && e.data.type === "adb") {
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

    pluginModules.push(TabbyTango);

    globalExtension["pluginModules"] = pluginModules.map((plugin) => {
        if ("default" in plugin) {
            plugin.default.pluginName = plugin.pluginName;
            return plugin.default;
        }
        return plugin;
    });

    const config = connector.loadConfig();
    await tabby.bootstrap({
        packageModules: pluginModules,
        bootstrapData: {
            config,
            executable: "web",
            isFirstWindow: true,
            windowID: 1,
            installedPlugins: [],
            userPluginsPath: "/",
        },
        debugMode: false,
        connector,
    });
}

function TabbyFrame() {
    useEffect(() => {
        // Only run at client side.
        start().catch((e) => {
            console.error(e);
        });
    }, []);

    return (
        <div>
            <style id="custom-css" />

            {/* @ts-expect-error */}
            <app-root />
        </div>
    );
}

TabbyFrame.noLayout = true;

export default TabbyFrame;
