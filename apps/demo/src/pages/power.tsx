// cspell: ignore bootloader
// cspell: ignore fastboot

import {
    DefaultButton,
    Icon,
    MessageBar,
    MessageBarType,
    Stack,
    TooltipHost,
} from "@fluentui/react";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { GLOBAL_STATE } from "../state";
import { Icons, RouteStackProps } from "../utils";

const Power: NextPage = () => {
    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>Power Menu - Tango</title>
            </Head>

            <div>
                <DefaultButton
                    text="Reboot"
                    disabled={!GLOBAL_STATE.device}
                    onClick={() => GLOBAL_STATE.device!.power.reboot()}
                />
            </div>

            <div style={{ marginTop: 20 }}>
                <DefaultButton
                    text="Power Off"
                    disabled={!GLOBAL_STATE.device}
                    onClick={() => GLOBAL_STATE.device!.power.powerOff()}
                />
            </div>

            <div style={{ marginTop: 20 }}>
                <DefaultButton
                    text="Press Power Button"
                    disabled={!GLOBAL_STATE.device}
                    onClick={() => GLOBAL_STATE.device!.power.powerButton()}
                />
            </div>

            <div style={{ marginTop: 20 }}>
                <MessageBar messageBarType={MessageBarType.severeWarning}>
                    Danger Zone Below
                </MessageBar>
            </div>

            <div style={{ marginTop: 20 }}>
                <DefaultButton
                    text="Reboot to Bootloader"
                    disabled={!GLOBAL_STATE.device}
                    onClick={() => GLOBAL_STATE.device!.power.bootloader()}
                />
            </div>

            <div style={{ marginTop: 20 }}>
                <DefaultButton
                    text="Reboot to Fastboot"
                    disabled={!GLOBAL_STATE.device}
                    onClick={() => GLOBAL_STATE.device!.power.fastboot()}
                />
            </div>

            <div style={{ marginTop: 20 }}>
                <DefaultButton
                    text="Reboot to Recovery"
                    disabled={!GLOBAL_STATE.device}
                    onClick={() => GLOBAL_STATE.device!.power.recovery()}
                />
            </div>

            <div style={{ marginTop: 20 }}>
                <DefaultButton
                    text="Reboot to Sideload"
                    disabled={!GLOBAL_STATE.device}
                    onClick={() => GLOBAL_STATE.device!.power.sideload()}
                />
            </div>

            <div style={{ marginTop: 20 }}>
                <DefaultButton
                    text="Reboot to Qualcomm EDL Mode"
                    disabled={!GLOBAL_STATE.device}
                    onClick={() => GLOBAL_STATE.device!.power.qualcommEdlMode()}
                />
                <TooltipHost
                    content={<span>Only works on some Qualcomm devices.</span>}
                >
                    <Icon
                        style={{
                            verticalAlign: "middle",
                            marginLeft: 4,
                            fontSize: 18,
                        }}
                        iconName={Icons.Info}
                    />
                </TooltipHost>
            </div>

            <div style={{ marginTop: 20 }}>
                <DefaultButton
                    text="Reboot to Samsung Odin Download Mode"
                    disabled={!GLOBAL_STATE.device}
                    onClick={() => GLOBAL_STATE.device!.power.samsungOdin()}
                />
                <TooltipHost
                    content={<span>Only works on Samsung devices.</span>}
                >
                    <Icon
                        style={{
                            verticalAlign: "middle",
                            marginLeft: 4,
                            fontSize: 18,
                        }}
                        iconName={Icons.Info}
                    />
                </TooltipHost>
            </div>
        </Stack>
    );
};

export default observer(Power);
