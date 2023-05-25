import { Link, Stack } from "@fluentui/react";
import { makeStyles } from "@griffel/react";
import { AdbSocket } from "@yume-chan/adb";
import {
    Consumable,
    ReadableStreamDefaultReader,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import {
    Agent,
    Client,
    Duplex,
    Pool,
    Symbols,
    WebSocket,
    request,
} from "@yume-chan/undici-browser";
import {
    action,
    makeAutoObservable,
    observable,
    reaction,
    runInAction,
} from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import getConfig from "next/config";
import Head from "next/head";
import type { Socket } from "node:net";
import { useCallback, useEffect } from "react";
import { GLOBAL_STATE } from "../state";
import { RouteStackProps } from "../utils";

class AdbUndiciSocket extends Duplex {
    private _socket: AdbSocket;
    private _reader: ReadableStreamDefaultReader<Uint8Array>;
    private _writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;

    constructor(socket: AdbSocket) {
        super();
        this._socket = socket;
        this._reader = this._socket.readable.getReader();
        this._writer = this._socket.writable.getWriter();
        this._reader.closed.then(() => this.emit("end"));
    }

    async _read(size: number): Promise<void> {
        try {
            const result = await this._reader.read();
            if (result.done) {
                this.emit("end");
            } else {
                this.push(result.value);
            }
        } catch {
            //ignore
        }
    }

    async _write(
        chunk: any,
        encoding: BufferEncoding,
        callback: (error?: Error | null | undefined) => void
    ): Promise<void> {
        const consumable = new Consumable(chunk);
        try {
            await this._writer.write(consumable);
            callback();
        } catch (e) {
            callback(e as Error);
        }
    }

    async _final(
        callback: (error?: Error | null | undefined) => void
    ): Promise<void> {
        await this._socket.close();
        callback();
    }

    async _destroy(
        error: Error | null,
        callback: (error: Error | null) => void
    ): Promise<void> {
        await this._socket.close();
        callback(error);
    }
}

const agent = new Agent({
    factory(origin, opts) {
        const pool = new Pool(origin, {
            ...opts,
            factory(origin, opts) {
                const client = new Client(origin, opts);
                // Remote debugging validates `Host` header to defend against DNS rebinding attacks.
                // But we can only pass socket name using hostname, so we need to override it.
                (client as any)[Symbols.kHostHeader] = "Host: localhost\r\n";
                return client;
            },
        });
        return pool;
    },
    async connect(options, callback) {
        try {
            const socket = await GLOBAL_STATE.adb!.createSocket(
                "localabstract:" + options.hostname
            );
            callback(null, new AdbUndiciSocket(socket) as unknown as Socket);
        } catch (e) {
            callback(e as Error, null);
        }
    },
});

interface Page {
    description: string;
    devtoolsFrontendUrl: string;
    id: string;
    title: string;
    type: string;
    url: string;
    webSocketDebuggerUrl: string;
}

interface Version {
    "Android-Package": string;
    Browser: string;
    "Protocol-Version": string;
    "User-Agent": string;
    "V8-Version": string;
    "WebKit-Version": string;
    webSocketDebuggerUrl: string;
}

// https://source.chromium.org/chromium/chromium/src/+/refs/heads/main:chrome/browser/devtools/device/devtools_device_discovery.cc;l=36;drc=4651cec294d1542d6673a89190e192e20de03240

async function getPages(socket: string) {
    const response = await request(`http://${socket}/json`, {
        dispatcher: agent,
    });
    const body = await response.body.json();
    return body as Page[];
}

async function getVersion(socket: string) {
    const response = await request(`http://${socket}/json/version`, {
        dispatcher: agent,
    });
    const body = await response.body.json();
    return body as Version;
}

async function focusPage(socket: string, page: Page) {
    await request(`http://${socket}/json/activate/${page.id}`, {
        dispatcher: agent,
    });
}

async function closePage(socket: string, page: Page) {
    await request(`http://${socket}/json/close/${page.id}`, {
        dispatcher: agent,
    });
}

const {
    publicRuntimeConfig: { basePath },
} = getConfig();

// Use a fixed version from Chrome's distribution, updated regularly.
// Opera: doesn't host its own frontend
// Edge: only have versions for Canary version, have license issues
// Brave: `frontendUrl` points to Google's but version number is invalid
const FRONTEND_SCRIPT =
    "https://chrome-devtools-frontend.appspot.com/serve_internal_file/@3c3641f7c28cf564edd441cc4ca2838b32c4e52a/front_end/entrypoints/inspector/inspector.js";

function getPopupParams(page: Page) {
    const frontendUrl = page.devtoolsFrontendUrl;
    const [, params] = frontendUrl.split("?");
    return {
        script: FRONTEND_SCRIPT,
        params,
    };
}

interface Browser {
    socket: string;
    version: Version;
    pages: Page[];
}

const STATE = makeAutoObservable(
    {
        browsers: [] as Browser[],
        intervalId: null as NodeJS.Timeout | null,
        visible: false,
    },
    {
        browsers: observable.deep,
    }
);

const SOCKET_NAMES = [
    "@chrome_devtools_remote",
    "@chrome_devtools_remote_[0-9]+",
    "@com.opera.browser.devtools",
    "@com.opera.browser.beta.devtools",
];

const GET_SOCKET_COMMAND = [
    "cat /proc/net/unix",
    `grep -E "${SOCKET_NAMES.join("|")}"`,
    "awk '{print substr($8, 2)}'",
];

async function getBrowsers() {
    const device = GLOBAL_STATE.adb!;
    const sockets = await device.subprocess.spawnAndWaitLegacy(
        GET_SOCKET_COMMAND.join(" | ")
    );
    const browsers: Browser[] = [];
    for (const socket of sockets.split("\n").filter(Boolean)) {
        if (browsers.some((browser) => browser.socket == socket)) {
            continue;
        }

        try {
            const version = await getVersion(socket);
            const pages = await getPages(socket);
            console.log(socket, version, pages);
            browsers.push({ socket, version, pages });
        } catch (e) {
            console.error(socket, e);
        }
    }
    runInAction(() => {
        STATE.browsers = browsers;
    });
}

reaction(
    () => [GLOBAL_STATE.adb, STATE.visible] as const,
    ([device, visible]) => {
        if (!device || !visible) {
            STATE.browsers = [];
            if (STATE.intervalId) {
                clearInterval(STATE.intervalId);
                STATE.intervalId = null;
            }
            return;
        }

        STATE.intervalId = setInterval(() => {
            getBrowsers();
        }, 5000);

        getBrowsers();
    }
);

const PACKAGE_NAMES: Record<string, string | undefined> = {
    "com.android.chrome": "Google Chrome",
    "com.chrome.beta": "Google Chrome Beta",
    "com.chrome.dev": "Google Chrome Dev",
    "com.chrome.canary": "Google Chrome Canary",
    "com.microsoft.emmx": "Microsoft Edge",
    "com.microsoft.emmx.beta": "Microsoft Edge Beta",
    "com.microsoft.emmx.dev": "Microsoft Edge Dev",
    "com.microsoft.emmx.canary": "Microsoft Edge Canary",
    "com.opera.browser": "Opera",
    "com.opera.browser.beta": "Opera Beta",
    "com.vivaldi.browser": "Vivaldi",
};

function getBrowserName(version: Version) {
    const [, versionNumber] = version.Browser.split("/");
    const name =
        PACKAGE_NAMES[version["Android-Package"]] || version["Android-Package"];
    return `${name} (${versionNumber})`;
}

const useClasses = makeStyles({
    header: {
        marginTop: "4px",
        marginBottom: "4px",
    },
    url: {
        marginLeft: "8px",
        color: "#999",
    },
    link: {
        marginRight: "12px",
    },
});

const ChromeDevToolsPage: NextPage = observer(function ChromeDevTools() {
    const classes = useClasses();

    useEffect(() => {
        runInAction(() => {
            STATE.visible = true;
        });

        return action(() => {
            STATE.visible = false;
        });
    }, []);

    const handleInspectClick = useCallback((socket: string, page: Page) => {
        const { script, params } = getPopupParams(page);
        const childWindow = window.open(
            `${basePath}/chrome-devtools-frame?script=${script}&${params}`,
            "_blank",
            "popup"
        )!;
        childWindow.addEventListener("message", (e) => {
            if (
                typeof e.data !== "object" ||
                !"type in e.data" ||
                e.data.type !== "AdbWebSocket"
            ) {
                return;
            }

            const url = new URL(e.data.url as string);
            url.host = socket;

            const port = e.ports[0];

            const ws = new WebSocket(url, {
                dispatcher: agent,
            });
            ws.binaryType = "arraybuffer";
            ws.onopen = () => {
                port.postMessage({ type: "open" });
            };
            ws.onclose = () => {
                port.postMessage({ type: "close" });
                port.close();
            };
            ws.onmessage = (e) => {
                const { data } = e;
                port.postMessage({
                    type: "message",
                    message: data,
                });
            };

            port.onmessage = (e) => {
                switch (e.data.type) {
                    case "message":
                        ws.send(e.data.message);
                        break;
                    case "close":
                        ws.close();
                        break;
                }
            };

            childWindow.addEventListener("close", () => {
                ws.close();
            });

            globalThis.addEventListener("beforeunload", () => {
                port.postMessage({ type: "close" });
                port.close();
            });
        });
    }, []);

    const handleFocusClick = useCallback((socket: string, page: Page) => {
        focusPage(socket, page);
    }, []);

    const handleCloseClick = useCallback((socket: string, page: Page) => {
        closePage(socket, page);
        getBrowsers();
    }, []);

    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>Chrome Remote Debugging - Tango</title>
            </Head>

            {STATE.browsers.length === 0 ? (
                <>
                    <h2>Supported browsers:</h2>
                    <ul>
                        <li>Google Chrome (stable/beta/dev/canary)</li>
                        <li>Microsoft Edge (stable/beta/dev/canary)</li>
                        <li>Opera (stable/beta)</li>
                        <li>Vivaldi</li>
                        <li>Any WebView with remote debugging on</li>
                    </ul>
                </>
            ) : (
                STATE.browsers.map((browser) => (
                    <>
                        {browser.version && (
                            <h3 className={classes.header}>
                                {getBrowserName(browser.version)}
                            </h3>
                        )}

                        {browser.pages.map((page) => (
                            <div key={page.id}>
                                <div>
                                    {page.title ? (
                                        <span
                                            dangerouslySetInnerHTML={{
                                                __html: page.title,
                                            }}
                                        />
                                    ) : (
                                        <i>No Title</i>
                                    )}

                                    <span className={classes.url}>
                                        {page.url || <i>No URL</i>}
                                    </span>
                                </div>
                                <div>
                                    <Link
                                        className={classes.link}
                                        onClick={() =>
                                            handleInspectClick(
                                                browser.socket,
                                                page
                                            )
                                        }
                                    >
                                        Inspect
                                    </Link>
                                    <Link
                                        className={classes.link}
                                        onClick={() =>
                                            handleFocusClick(
                                                browser.socket,
                                                page
                                            )
                                        }
                                    >
                                        Focus
                                    </Link>
                                    <Link
                                        className={classes.link}
                                        onClick={() =>
                                            handleCloseClick(
                                                browser.socket,
                                                page
                                            )
                                        }
                                    >
                                        Close
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </>
                ))
            )}
        </Stack>
    );
});

export default ChromeDevToolsPage;
