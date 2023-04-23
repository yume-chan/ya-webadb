import { AdbProxyServer } from "@yume-chan/adb-backend-proxy";
import { autorun } from "mobx";
import getConfig from "next/config";
import { GLOBAL_STATE } from "../state";

let proxy: AdbProxyServer | undefined;
let resizeObserver: ResizeObserver | undefined;
let frame: HTMLIFrameElement | undefined;

function syncDevice() {
    if (proxy) {
        proxy.dispose();
        proxy = undefined;
    }

    if (GLOBAL_STATE.device && frame) {
        const proxy = new AdbProxyServer(GLOBAL_STATE.device);
        const info = proxy.createPort();
        frame.contentWindow?.postMessage(
            {
                type: "adb",
                ...info,
            },
            "*",
            [info.port]
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

        window.addEventListener("message", (e) => {
            // Wait for Tabby to be ready
            if (e.source === frame?.contentWindow && e.data === "adb") {
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
