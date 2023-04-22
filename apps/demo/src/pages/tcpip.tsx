// cspell: ignore addrs

import {
    ICommandBarItemProps,
    MessageBar,
    Stack,
    StackItem,
    Text,
    TextField,
    Toggle,
} from "@fluentui/react";
import { autorun, makeAutoObservable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import { useCallback, useEffect } from "react";
import { CommandBar, ExternalLink } from "../components";
import { GLOBAL_STATE } from "../state";
import { Icons, RouteStackProps, asyncEffect } from "../utils";

class TcpIpState {
    initial = true;
    visible = false;
    serviceListenAddresses: string[] | undefined = undefined;
    servicePortEnabled = false;
    servicePort: string = "";
    persistPortEnabled = false;
    persistPort: string | undefined = undefined;

    constructor() {
        makeAutoObservable(this, {
            initial: false,
            queryInfo: false,
            applyServicePort: false,
        });

        autorun(() => {
            if (GLOBAL_STATE.device) {
                if (this.initial && this.visible) {
                    this.initial = false;
                    this.queryInfo();
                }
            } else {
                this.initial = true;
            }
        });
    }

    get commandBarItems(): ICommandBarItemProps[] {
        return [
            {
                key: "refresh",
                disabled: !GLOBAL_STATE.device,
                iconProps: { iconName: Icons.ArrowClockwise },
                text: "Refresh",
                onClick: this.queryInfo as VoidFunction,
            },
            {
                key: "apply",
                disabled: !GLOBAL_STATE.device,
                iconProps: { iconName: Icons.Save },
                text: "Apply",
                onClick: this.applyServicePort,
            },
        ];
    }

    queryInfo = asyncEffect(async (signal) => {
        if (!GLOBAL_STATE.device) {
            runInAction(() => {
                this.serviceListenAddresses = undefined;
                this.servicePortEnabled = false;
                this.servicePort = "";
                this.persistPortEnabled = false;
                this.persistPort = undefined;
            });
            return;
        }

        const serviceListenAddresses = await GLOBAL_STATE.device.getProp(
            "service.adb.listen_addrs"
        );
        const servicePort = await GLOBAL_STATE.device.getProp(
            "service.adb.tcp.port"
        );
        const persistPort = await GLOBAL_STATE.device.getProp(
            "persist.adb.tcp.port"
        );

        if (signal.aborted) {
            return;
        }

        runInAction(() => {
            this.serviceListenAddresses =
                serviceListenAddresses !== ""
                    ? serviceListenAddresses.split(",")
                    : undefined;

            if (servicePort) {
                this.servicePortEnabled =
                    !serviceListenAddresses && servicePort !== "0";
                this.servicePort = servicePort;
            } else {
                this.servicePortEnabled = false;
                this.servicePort = "5555";
            }

            if (persistPort) {
                this.persistPortEnabled =
                    !serviceListenAddresses && !servicePort;
                this.persistPort = persistPort;
            } else {
                this.persistPortEnabled = false;
                this.persistPort = undefined;
            }
        });
    });

    applyServicePort = async () => {
        if (!GLOBAL_STATE.device) {
            return;
        }

        if (state.servicePortEnabled) {
            await GLOBAL_STATE.device.tcpip.setPort(
                Number.parseInt(state.servicePort, 10)
            );
        } else {
            await GLOBAL_STATE.device.tcpip.disable();
        }
    };
}

const state = new TcpIpState();

const TcpIp: NextPage = () => {
    useEffect(() => {
        runInAction(() => {
            state.visible = true;
        });

        return () => {
            runInAction(() => {
                state.visible = false;
            });
        };
    });

    const handleServicePortEnabledChange = useCallback(
        (e: unknown, value?: boolean) => {
            runInAction(() => {
                state.servicePortEnabled = !!value;
            });
        },
        []
    );

    const handleServicePortChange = useCallback(
        (e: unknown, value?: string) => {
            if (value === undefined) {
                return;
            }
            runInAction(() => (state.servicePort = value));
        },
        []
    );

    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>ADB over WiFi - Tango</title>
            </Head>

            <CommandBar items={state.commandBarItems} />

            <StackItem>
                <MessageBar>
                    <Text>
                        For Tango to wirelessly connect to your device,
                        <ExternalLink
                            href="https://github.com/yume-chan/ya-webadb/discussions/245#discussioncomment-384030"
                            spaceBefore
                            spaceAfter
                        >
                            extra software
                        </ExternalLink>
                        is required.
                    </Text>
                </MessageBar>
            </StackItem>
            <StackItem>
                <MessageBar>
                    <Text>
                        Your device will disconnect after changing ADB over WiFi
                        config.
                    </Text>
                </MessageBar>
            </StackItem>

            <StackItem>
                <Toggle
                    inlineLabel
                    label="service.adb.listen_addrs"
                    disabled
                    checked={!!state.serviceListenAddresses}
                    onText="Enabled"
                    offText="Disabled"
                />
                {state.serviceListenAddresses?.map((address) => (
                    <TextField
                        key={address}
                        disabled
                        value={address}
                        styles={{ root: { width: 300 } }}
                    />
                ))}
            </StackItem>

            <StackItem>
                <Toggle
                    inlineLabel
                    label="service.adb.tcp.port"
                    checked={state.servicePortEnabled}
                    disabled={
                        !GLOBAL_STATE.device || !!state.serviceListenAddresses
                    }
                    onText="Enabled"
                    offText="Disabled"
                    onChange={handleServicePortEnabledChange}
                />
                <TextField
                    disabled={
                        !GLOBAL_STATE.device || !!state.serviceListenAddresses
                    }
                    value={state.servicePort}
                    styles={{ root: { width: 300 } }}
                    onChange={handleServicePortChange}
                />
            </StackItem>

            <StackItem>
                <Toggle
                    inlineLabel
                    label="persist.adb.tcp.port"
                    disabled
                    checked={state.persistPortEnabled}
                    onText="Enabled"
                    offText="Disabled"
                />
                {state.persistPort && (
                    <TextField
                        disabled
                        value={state.persistPort}
                        styles={{ root: { width: 300 } }}
                    />
                )}
            </StackItem>
        </Stack>
    );
};

export default observer(TcpIp);
