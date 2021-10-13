import { CommandBar, ICommandBarItemProps, MessageBar, Stack, StackItem, Text, TextField, Toggle } from "@fluentui/react";
import { makeAutoObservable, reaction, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import React, { useCallback } from "react";
import { ExternalLink } from "../components";
import { device } from "../state";
import { asyncEffect, RouteStackProps } from "../utils";

class TcpIpState {
    serviceListenAddresses: string[] | undefined;
    servicePortEnabled = false;
    servicePort: string = '';
    persistPortEnabled = false;
    persistPort: string | undefined;

    constructor() {
        makeAutoObservable(this);
        reaction(
            () => device.current,
            () => this.queryInfo(),
            { fireImmediately: true }
        );
    }

    get commandBarItems(): ICommandBarItemProps[] {
        return [
            {
                key: 'refresh',
                disabled: !device.current,
                iconProps: { iconName: 'Refresh' },
                text: 'Refresh',
                onClick: () => { this.queryInfo(); },
            },
            {
                key: 'apply',
                disabled: !device.current,
                iconProps: { iconName: 'Save' },
                text: 'Apply',
                onClick: () => { this.applyServicePort(); },
            }
        ];
    }

    queryInfo = asyncEffect(async (signal) => {
        if (!device.current) {
            runInAction(() => {
                this.serviceListenAddresses = undefined;
                this.servicePortEnabled = false;
                this.servicePort = '';
                this.persistPortEnabled = false;
                this.persistPort = undefined;
            });
            return;
        }

        const serviceListenAddresses = await device.current.getProp('service.adb.listen_addrs');
        const servicePort = await device.current.getProp('service.adb.tcp.port');
        const persistPort = await device.current.getProp('persist.adb.tcp.port');

        if (signal.aborted) {
            return;
        }

        runInAction(() => {
            this.serviceListenAddresses = serviceListenAddresses !== '' ? serviceListenAddresses.split(',') : undefined;

            if (servicePort) {
                this.servicePortEnabled = !serviceListenAddresses && servicePort !== '0';
                this.servicePort = servicePort;
            } else {
                this.servicePortEnabled = false;
                this.servicePort = '5555';
            }

            if (persistPort) {
                this.persistPortEnabled = !serviceListenAddresses && !servicePort;
                this.persistPort = persistPort;
            } else {
                this.persistPortEnabled = false;
                this.persistPort = undefined;
            }
        });
    });

    async applyServicePort() {
        if (!device.current) {
            return;
        }

        if (state.servicePortEnabled) {
            await device.current.tcpip.setPort(Number.parseInt(state.servicePort, 10));
        } else {
            await device.current.tcpip.disable();
        }
    }
}

const state = new TcpIpState();

const TcpIp: NextPage = () => {
    const handleServicePortEnabledChange = useCallback((e, value?: boolean) => {
        runInAction(() => { state.servicePortEnabled = !!value; });
    }, []);

    const handleServicePortChange = useCallback((e, value?: string) => {
        if (value === undefined) {
            return;
        }
        runInAction(() => state.servicePort = value);
    }, []);

    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>ADB over WiFi - WebADB</title>
            </Head>

            <CommandBar items={state.commandBarItems} />

            <StackItem>
                <MessageBar>
                    <Text>
                        For WebADB to wirelessly connect to your phone,
                        <ExternalLink href="https://github.com/yume-chan/ya-webadb/discussions/245#discussioncomment-384030" spaceBefore spaceAfter>extra software</ExternalLink>
                        is required.
                    </Text>
                </MessageBar>
            </StackItem>
            <StackItem>
                <MessageBar >
                    <Text>Your device will disconnect after changing ADB over WiFi config.</Text>
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
                    disabled={!device.current || !!state.serviceListenAddresses}
                    onText="Enabled"
                    offText="Disabled"
                    onChange={handleServicePortEnabledChange}
                />
                {device && (
                    <TextField
                        disabled={!!state.serviceListenAddresses}
                        value={state.servicePort}
                        styles={{ root: { width: 300 } }}
                        onChange={handleServicePortChange}
                    />
                )}
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
