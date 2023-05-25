import { AdbIncomingSocketHandler, AdbTransport } from "@yume-chan/adb";
import {
    WrapConsumableStream,
    WrapWritableStream,
} from "@yume-chan/stream-extra";
import { ValueOrPromise } from "@yume-chan/struct";
import * as Comlink from "comlink";
import { autorun } from "mobx";
import getConfig from "next/config";
import { GLOBAL_STATE } from "../state";

let port: MessagePort | undefined;
let resizeObserver: ResizeObserver | undefined;
let frame: HTMLIFrameElement | undefined;

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
        address?: string
    ): ValueOrPromise<string>;

    removeReverseTunnel(address: string): ValueOrPromise<void>;

    clearReverseTunnels(): ValueOrPromise<void>;

    close(): ValueOrPromise<void>;
}

class AdbProxyTransportServerImpl implements AdbProxyTransportServer {
    private _transport: AdbTransport;

    public get disconnected() {
        return this._transport.disconnected;
    }

    public constructor(transport: AdbTransport) {
        this._transport = transport;
    }

    public async connect(
        service: string,
        callback: (
            readable: ReadableStream<Uint8Array>,
            writable: WritableStream<Uint8Array>,
            close: () => ValueOrPromise<void>
        ) => void
    ) {
        const socket = await this._transport.connect(service);
        const writable = new WrapWritableStream(
            socket.writable
        ).bePipedThroughFrom(new WrapConsumableStream());
        callback(
            Comlink.transfer(socket.readable, [socket.readable]),
            Comlink.transfer(writable, [writable]),
            Comlink.proxy(() => socket.close())
        );
    }

    public addReverseTunnel(
        handler: AdbIncomingSocketHandler,
        address?: string
    ): ValueOrPromise<string> {
        return this._transport.addReverseTunnel(handler, address);
    }

    public removeReverseTunnel(address: string): ValueOrPromise<void> {
        return this._transport.removeReverseTunnel(address);
    }

    public clearReverseTunnels(): ValueOrPromise<void> {
        return this._transport.clearReverseTunnels();
    }

    public close(): ValueOrPromise<void> {
        return this._transport.close();
    }
}

function syncDevice() {
    if (!frame) {
        return;
    }

    if (port) {
        port.close();
        port = undefined;
    }

    const { adb: adb } = GLOBAL_STATE;
    if (adb) {
        const channel = new MessageChannel();
        port = channel.port1;

        const server = new AdbProxyTransportServerImpl(adb.transport);
        Comlink.expose(server, port);

        const { product, model, device, features } = adb.banner;
        frame.contentWindow?.postMessage(
            {
                type: "adb-connect",
                serial: adb.serial,
                maxPayloadSize: adb.maxPayloadSize,
                banner: {
                    product,
                    model,
                    device,
                    features,
                },
                port: channel.port2,
            },
            "*",
            [channel.port2]
        );
    }
}

export function attachTabbyFrame(container: HTMLDivElement | null) {
    if (container === null) {
        if (resizeObserver !== undefined) {
            resizeObserver.disconnect();
        }
        if (frame !== undefined) {
            frame.style.visibility = "hidden";
        }
        return;
    }

    if (!frame) {
        const {
            publicRuntimeConfig: { basePath },
        } = getConfig();

        frame = document.createElement("iframe");
        frame.src = `${basePath}/tabby-frame`;
        frame.style.display = "block";
        frame.style.position = "fixed";
        frame.style.border = "none";
        document.body.appendChild(frame);

        globalThis.addEventListener("message", (e) => {
            // Wait for Tabby to be ready
            if (e.source === frame?.contentWindow && e.data === "adb-ready") {
                syncDevice();
            }
        });

        // Sync device when it's changed
        autorun(syncDevice);
    }

    // Because re-parent an iframe will cause it to reload,
    // use visibility to show/hide it
    // and use a ResizeObserver to put it in the right place.
    frame.style.visibility = "visible";
    resizeObserver = new ResizeObserver(() => {
        const { top, left, width, height } = container.getBoundingClientRect();
        if (width === 0 || height === 0) {
            // zero size makes xterm.js wrap lines incorrectly
            return;
        }
        frame!.style.top = `${top}px`;
        frame!.style.left = `${left}px`;
        frame!.style.width = `${width}px`;
        frame!.style.height = `${height}px`;
    });
    resizeObserver.observe(container);
}
