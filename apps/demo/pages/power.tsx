import { DefaultButton, Icon, MessageBar, MessageBarType, TooltipHost } from "@fluentui/react";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import { globalState } from "../state";
import { Icons } from "../utils";

const Power: NextPage = () => {
    return (
        <div style={{ padding: 20 }}>
            <div>
                <DefaultButton text="Reboot" disabled={!globalState.device} onClick={() => globalState.device!.power.reboot()} />
            </div>

            <div style={{ marginTop: 20 }}>
                <DefaultButton text="Power Off" disabled={!globalState.device} onClick={() => globalState.device!.power.powerOff()} />
            </div>

            <div style={{ marginTop: 20 }}>
                <DefaultButton text="Press Power Button" disabled={!globalState.device} onClick={() => globalState.device!.power.powerButton()} />
            </div>

            <div style={{ marginTop: 20 }}>
                <MessageBar messageBarType={MessageBarType.severeWarning}>Danger Zone Below</MessageBar>
            </div>

            <div style={{ marginTop: 20 }}>
                <DefaultButton text="Reboot to Bootloader" disabled={!globalState.device} onClick={() => globalState.device!.power.bootloader()} />
            </div>

            <div style={{ marginTop: 20 }}>
                <DefaultButton text="Reboot to Fastboot" disabled={!globalState.device} onClick={() => globalState.device!.power.fastboot()} />
            </div>

            <div style={{ marginTop: 20 }}>
                <DefaultButton text="Reboot to Recovery" disabled={!globalState.device} onClick={() => globalState.device!.power.recovery()} />
            </div>

            <div style={{ marginTop: 20 }}>
                <DefaultButton text="Reboot to Sideload" disabled={!globalState.device} onClick={() => globalState.device!.power.sideload()} />
            </div>

            <div style={{ marginTop: 20 }}>
                <DefaultButton text="Reboot to Qualcomm EDL Mode" disabled={!globalState.device} onClick={() => globalState.device!.power.qualcommEdlMode()} />
                <TooltipHost content={<span>Only works on some Qualcomm devices.</span>}>
                    <Icon style={{ verticalAlign: 'middle', marginLeft: 4, fontSize: 18 }} iconName={Icons.Info} />
                </TooltipHost>
            </div>

            <div style={{ marginTop: 20 }}>
                <DefaultButton text="Reboot to Samsung Odin Download Mode" disabled={!globalState.device} onClick={() => globalState.device!.power.samsungOdin()} />
                <TooltipHost content={<span>Only works on Samsung devices.</span>}>
                    <Icon style={{ verticalAlign: 'middle', marginLeft: 4, fontSize: 18 }} iconName={Icons.Info} />
                </TooltipHost>
            </div>
        </div>
    );
};

export default observer(Power);
