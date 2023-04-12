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
    setGlobalDispatcher,
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
        this._socket.end.then(() => this.emit("end"));
    }

    async _read(size: number): Promise<void> {
        const result = await this._reader.read();
        if (result.done) {
            this.emit("end");
        } else {
            this.push(result.value);
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
        const socket = await GLOBAL_STATE.device!.createSocket(
            "localabstract:" + options.hostname
        );
        callback(null, new AdbUndiciSocket(socket) as unknown as Socket);
    },
});
// WebSocket only uses global dispatcher
setGlobalDispatcher(agent);

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
    const response = await request(`http://${socket}/json`);
    const body = await response.body.json();
    return body as Page[];
}

async function getVersion(socket: string) {
    const response = await request(`http://${socket}/json/version`);
    const body = await response.body.json();
    return body as Version;
}

async function focusPage(socket: string, page: Page) {
    await request(`http://${socket}/json/activate/${page.id}`);
}

async function closePage(socket: string, page: Page) {
    await request(`http://${socket}/json/close/${page.id}`);
}

const {
    publicRuntimeConfig: { basePath },
} = getConfig();

function getPopupParams(page: Page) {
    const frontendUrl = page.devtoolsFrontendUrl;
    const [frontendBase, params] = frontendUrl.split("?");
    const script = frontendBase.startsWith(
        "https://aka.ms/docs-landing-page/serve_rev/"
    )
        ? // Edge
          frontendBase
              .replace(
                  "https://aka.ms/docs-landing-page/serve_rev/",
                  "https://devtools.azureedge.net/serve_file/"
              )
              .replace("inspector.html", "entrypoints/inspector/inspector.js")
        : // Chrome
          frontendBase.replace(
              "inspector.html",
              "front_end/entrypoints/inspector/inspector.js"
          );
    return { script, params };
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

async function getBrowsers() {
    const device = GLOBAL_STATE.device!;
    const sockets = await device.subprocess.spawnAndWaitLegacy(
        `cat /proc/net/unix | grep -E "@chrome_devtools_remote|@chrome_devtools_remote_[0-9]+" | awk '{print substr($8, 2)}'`
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
    () => [GLOBAL_STATE.device, STATE.visible] as const,
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

function getBrowserName(version: Version) {
    const [name, versionNumber] = version.Browser.split("/");
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

            const ws = new WebSocket(url);
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

            window.addEventListener("beforeunload", () => {
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

            {STATE.browsers.map((browser) => (
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
                                        handleInspectClick(browser.socket, page)
                                    }
                                >
                                    Inspect
                                </Link>
                                <Link
                                    className={classes.link}
                                    onClick={() =>
                                        handleFocusClick(browser.socket, page)
                                    }
                                >
                                    Focus
                                </Link>
                                <Link
                                    className={classes.link}
                                    onClick={() =>
                                        handleCloseClick(browser.socket, page)
                                    }
                                >
                                    Close
                                </Link>
                            </div>
                        </div>
                    ))}
                </>
            ))}
        </Stack>
    );
});

export default ChromeDevToolsPage;
