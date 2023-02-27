import { DefaultButton, PrimaryButton } from "@fluentui/react";
import { AdbWebUsbBackend } from "@yume-chan/adb-backend-webusb";
import {
    aoaGetProtocol,
    aoaSetAudioMode,
    aoaStartAccessory,
} from "@yume-chan/aoa";
import { observer } from "mobx-react-lite";
import { useCallback, useState } from "react";
import { GLOBAL_STATE } from "../state";

function AudioPage() {
    const [supported, setSupported] = useState<boolean | undefined>(undefined);
    const handleQuerySupportClick = useCallback(async () => {
        const backend = GLOBAL_STATE.backend as AdbWebUsbBackend;
        const device = backend.device;
        const version = await aoaGetProtocol(device);
        setSupported(version >= 2);
    }, []);

    const handleEnableClick = useCallback(async () => {
        const backend = GLOBAL_STATE.backend as AdbWebUsbBackend;
        const device = backend.device;
        const version = await aoaGetProtocol(device);
        if (version < 2) {
            return;
        }
        await aoaSetAudioMode(device, 1);
        await aoaStartAccessory(device);
    }, []);
    const handleDisableClick = useCallback(async () => {
        const backend = GLOBAL_STATE.backend as AdbWebUsbBackend;
        const device = backend.device;
        const version = await aoaGetProtocol(device);
        if (version < 2) {
            return;
        }
        await aoaSetAudioMode(device, 0);
        await aoaStartAccessory(device);
    }, []);

    if (
        !GLOBAL_STATE.backend ||
        !(GLOBAL_STATE.backend instanceof AdbWebUsbBackend)
    ) {
        return <div>Audio forward can only be used with WebUSB backend.</div>;
    }

    return (
        <div>
            <div>
                Supported:{" "}
                {supported === undefined ? "Unknown" : supported ? "Yes" : "No"}
            </div>
            <div>
                <PrimaryButton
                    disabled={!GLOBAL_STATE.backend}
                    onClick={handleQuerySupportClick}
                >
                    Query Support
                </PrimaryButton>
                <DefaultButton
                    disabled={!supported}
                    onClick={handleEnableClick}
                >
                    Enable
                </DefaultButton>
                <DefaultButton
                    disabled={!supported}
                    onClick={handleDisableClick}
                >
                    Disable
                </DefaultButton>
            </div>
        </div>
    );
}

export default observer(AudioPage);
