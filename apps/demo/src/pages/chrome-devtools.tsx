import { AdbSocket } from "@yume-chan/adb";
import {
    Consumable,
    ReadableStreamDefaultReader,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import undici, {
    Agent,
    WebSocket,
    request,
    setGlobalDispatcher,
} from "@yume-chan/undici-browser";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import getConfig from "next/config";
import { useRouter } from "next/router";
import type { Socket } from "node:net";
import { useCallback, useEffect, useState } from "react";
import { GLOBAL_STATE } from "../state";

class AdbUndiciSocket extends undici.Duplex {
    private _socket: AdbSocket;
    private _reader: ReadableStreamDefaultReader<Uint8Array>;
    private _writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;

    constructor(socket: AdbSocket) {
        super();
        this._socket = socket;
        this._reader = this._socket.readable.getReader();
        this._writer = this._socket.writable.getWriter();
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
        this._reader.releaseLock();
        this._writer.releaseLock();
        await this._socket.close();
        callback();
    }
}

const agent = new Agent({
    async connect(options, callback) {
        const socket = await GLOBAL_STATE.device!.createSocket(
            "localabstract:chrome_devtools_remote"
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

async function getPages(): Promise<Page[]> {
    const response = await request("http://localhost/json", {
        dispatcher: agent,
    });
    const body = await response.body.json();
    return body;
}

const {
    publicRuntimeConfig: { basePath },
} = getConfig();

const ChromeDevToolsPage: NextPage = observer(function ChromeDevTools() {
    const [pages, setPages] = useState<Page[]>([]);
    const [script, setScript] = useState<string>(``);
    const [params, setParams] = useState<string>();

    useEffect(() => {
        if (!GLOBAL_STATE.device) {
            return;
        }
        getPages().then((result) => {
            setPages(result);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [GLOBAL_STATE.device]);

    const router = useRouter();

    const handleInspectClick = useCallback((item: Page) => {
        const frontendUrl = item.devtoolsFrontendUrl;
        const [frontendBase, frontendParams] = frontendUrl.split("?");
        const scriptSrc = frontendBase.replace(
            "inspector.html",
            "front_end/entrypoints/inspector/inspector.js"
        );
        setScript(scriptSrc);
        setParams(frontendParams);
    }, []);

    const handleIframeRef = useCallback((iframe: HTMLIFrameElement | null) => {
        if (!iframe) {
            return;
        }

        const contentWindow = iframe.contentWindow!;
        contentWindow.addEventListener("message", (e) => {
            console.log("message", e.data, e.ports);

            if (
                typeof e.data !== "object" ||
                !"type in e.data" ||
                e.data.type !== "AdbWebSocket"
            ) {
                return;
            }

            const url = e.data.url as string;
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
        });
    }, []);

    if (script && params) {
        return (
            <iframe
                ref={handleIframeRef}
                src={`${basePath}/chrome-devtools-frame?script=${encodeURIComponent(
                    script
                )}&${params}`}
                seamless
                style={{ width: "100%", height: "100%" }}
            />
        );
    }

    return (
        <div>
            {pages.map((page) => (
                <div key={page.id}>
                    <div>
                        <b>Title: {page.title || <i>No Title</i>}</b>
                    </div>
                    <div>URL: {page.url || <i>No URL</i>}</div>
                    <div>
                        <button onClick={() => handleInspectClick(page)}>
                            Inspect
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
});

export default ChromeDevToolsPage;
