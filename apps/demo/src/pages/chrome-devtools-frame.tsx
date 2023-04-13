import { useEffect } from "react";

function ChromeDevToolsFrame() {
    useEffect(() => {
        var WebSocketOriginal = globalThis.WebSocket;
        globalThis.WebSocket = class WebSocket extends EventTarget {
            public static readonly CONNECTING: 0 = 0;
            public static readonly OPEN: 1 = 1;
            public static readonly CLOSING: 2 = 2;
            public static readonly CLOSED: 3 = 3;

            public readonly CONNECTING: 0 = 0;
            public readonly OPEN: 1 = 1;
            public readonly CLOSING: 2 = 2;
            public readonly CLOSED: 3 = 3;

            public binaryType: BinaryType = "arraybuffer";
            public readonly bufferedAmount: number = 0;
            public readonly extensions: string = "";

            public readonly protocol: string = "";
            public readonly readyState: number = 1;
            public readonly url: string;

            private _port: MessagePort;

            public onclose: ((this: WebSocket, ev: CloseEvent) => any) | null =
                null;
            /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/WebSocket/error_event) */
            public onerror: ((this: WebSocket, ev: Event) => any) | null = null;
            /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/WebSocket/message_event) */
            public onmessage:
                | ((this: WebSocket, ev: MessageEvent) => any)
                | null = null;
            /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/WebSocket/open_event) */
            public onopen: ((this: WebSocket, ev: Event) => any) | null = null;

            constructor(url: string) {
                super();

                console.log("WebSocket constructor", url);
                this.url = url;

                var channel = new MessageChannel();
                this._port = channel.port1;

                if (url.includes("/_next/")) {
                    this._port.close();
                    // @ts-ignore
                    return new WebSocketOriginal(url);
                }

                this._port.onmessage = (e) => {
                    switch (e.data.type) {
                        case "open":
                            this.onopen?.(new Event("open"));
                            break;
                        case "message":
                            this.onmessage?.(
                                new MessageEvent("message", {
                                    data: e.data.message,
                                })
                            );
                            break;
                        case "close":
                            this.onclose?.(new CloseEvent("close"));
                            this._port.close();
                            break;
                    }
                };
                window.postMessage({ type: "AdbWebSocket", url }, "*", [
                    channel.port2,
                ]);
            }

            send(data: ArrayBuffer) {
                this._port.postMessage({ type: "message", message: data });
            }

            public close() {
                this._port.postMessage({ type: "close" });
                this._port.close();
            }
        } as typeof WebSocket;
        console.log("WebSocket hooked");

        const script = document.createElement("script");
        script.type = "module";
        script.src = new URLSearchParams(location.search).get(
            "script"
        ) as string;
        document.body.appendChild(script);
    }, []);

    return null;
}
ChromeDevToolsFrame.noLayout = true;
export default ChromeDevToolsFrame;
