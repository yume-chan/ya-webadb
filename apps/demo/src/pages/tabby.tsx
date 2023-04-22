import { autorun } from "mobx";
import { useEffect } from "react";
import { Subject } from "rxjs";
import { GLOBAL_STATE } from "../state";

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
        return (
            localStorage.getItem("tabby-config") ||
            JSON.stringify({
                recoverTabs: false,
                web: {
                    preventAccidentalTabClosure: false,
                },
                terminal: {
                    fontSize: 11,
                },
            })
        );
    }

    async saveConfig(content: string): Promise<void> {
        localStorage.setItem("tabby-config", content);
    }

    getAppVersion(): string {
        return "1.0";
    }

    createSocket() {
        return new NotImplementedSocket();
    }
}

function TabbyPage() {
    useEffect(() => {
        async function start() {
            window["__filename"] = "";

            const connector = new WebConnector();
            (window as any)["__connector__"] = connector;

            // @ts-expect-error
            await import("tabby-web-container/dist/preload.mjs");
            // @ts-expect-error
            await import("tabby-web-container/dist/bundle.js");

            async function webRequire(url: string) {
                console.log(`Loading ${url}`);
                const e = document.createElement("script");
                window["module"] = { exports: {} } as any;
                window["exports"] = window["module"].exports;
                await new Promise((resolve) => {
                    e.onload = resolve;
                    e.src = url;
                    document.head.appendChild(e);
                });
                return window["module"].exports;
            }

            async function prefetchURL(url: string) {
                await (await fetch(url)).text();
            }

            const tabby = (window as any)["Tabby"];

            const pluginInfos: {
                name: string;
                url: string;
            }[] = [
                {
                    name: "tabby-core",
                    url: new URL(
                        "tabby-core/dist/index.js",
                        import.meta.url
                    ).toString(),
                },
                {
                    name: "tabby-settings",
                    url: new URL(
                        "tabby-settings/dist/index.js",
                        import.meta.url
                    ).toString(),
                },
                {
                    name: "tabby-terminal",
                    url: new URL(
                        "tabby-terminal/dist/index.js",
                        import.meta.url
                    ).toString(),
                },
                {
                    name: "tabby-community-color-schemes",
                    url: new URL(
                        "tabby-community-color-schemes/dist/index.js",
                        import.meta.url
                    ).toString(),
                },
                {
                    name: "tabby-web",
                    url: new URL(
                        "tabby-web/dist/index.js",
                        import.meta.url
                    ).toString(),
                },
            ];

            await Promise.all(
                pluginInfos.map((pluginInfo) => prefetchURL(pluginInfo.url))
            );

            const pluginModules = [];
            for (const info of pluginInfos) {
                const result = await webRequire(info.url);
                tabby.registerPluginModule(info.name, result);
                pluginModules.push(result);
            }

            const TabbyAdb = await webRequire(
                new URL(
                    "@yume-chan/tabby-tango/dist/index.js",
                    import.meta.url
                ).toString()
            );
            autorun(() => {
                TabbyAdb.TabbyAdb.value = GLOBAL_STATE.device;
            });
            pluginModules.push(TabbyAdb);

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

export default TabbyPage;
