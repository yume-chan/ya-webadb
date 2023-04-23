import { AdbProxyServer } from "@yume-chan/adb-backend-proxy";
import { autorun } from "mobx";
import getConfig from "next/config";
import { GLOBAL_STATE } from "../state";

let frame: HTMLIFrameElement | undefined;

const {
    publicRuntimeConfig: { basePath },
} = getConfig();

export function attachTabbyFrame(container: HTMLDivElement) {
    if (!frame) {
        frame = document.createElement("iframe");
        frame.src = `${basePath}/tabby-frame`;
        frame.style.display = "block";
        frame.style.width = "100%";
        frame.style.height = "100%";
        frame.style.border = "none";
        autorun(() => {
            if (GLOBAL_STATE.device) {
                const server = new AdbProxyServer(GLOBAL_STATE.device);
                const handle = server.createPort();
                frame?.contentWindow?.postMessage(
                    {
                        type: "adb",
                        port: handle.port,
                        version: handle.version,
                        maxPayloadSize: handle.maxPayloadSize,
                        banner: handle.banner,
                    },
                    "*",
                    [handle.port]
                );
            }
        });
    }

    container.appendChild(frame);
}
