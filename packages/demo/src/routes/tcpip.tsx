import { Label, MessageBar, PrimaryButton, Stack, StackItem, Text, TextField } from '@fluentui/react';
import { useId } from '@uifabric/react-hooks';
import React, { useCallback, useEffect, useState } from 'react';
import { CommonStackTokens } from '../styles';
import { withDisplayName } from '../utils';
import { RouteProps } from './type';

export const TcpIp = withDisplayName('TcpIp', ({
    device
}: RouteProps): JSX.Element | null => {
    const [tcpPort, setTcpAddresses] = useState<string[] | undefined>();
    useEffect(() => {
        if (!device) {
            setTcpAddresses(undefined);
        }
    }, [device]);

    const queryTcpAddress = useCallback(async () => {
        if (!device) {
            return;
        }

        const result = await device.tcpip.getAddresses();
        setTcpAddresses(result);
    }, [device]);

    const [tcpPortValue, setTcpPortValue] = useState('5555');
    const tcpPortInputId = useId('tcpPort');
    const enableTcp = useCallback(async () => {
        if (!device) {
            return;
        }

        await device.tcpip.setPort(Number.parseInt(tcpPortValue, 10));
    }, [device, tcpPortValue]);

    const disableTcp = useCallback(async () => {
        if (!device) {
            return;
        }

        await device.tcpip.disable();
    }, [device]);

    return (
        <>
            <StackItem>
                <MessageBar>
                    <Text>Although WebADB can enable ADB over WiFi for you, it can't connect to your device wirelessly.</Text>
                </MessageBar>
            </StackItem>
            <StackItem>
                <MessageBar >
                    <Text>Your device will disconnect after changing ADB over WiFi config.</Text>
                </MessageBar>
            </StackItem>
            <Stack horizontal verticalAlign="center" tokens={CommonStackTokens}>
                <StackItem>
                    <PrimaryButton text="Update Status" disabled={!device} onClick={queryTcpAddress} />
                </StackItem>
                <StackItem>
                    {tcpPort !== undefined &&
                        (tcpPort.length !== 0
                            ? `Enabled at ${tcpPort.join(', ')}`
                            : 'Disabled')}
                </StackItem>
            </Stack>
            <Stack horizontal verticalAlign="center" tokens={CommonStackTokens}>
                <StackItem>
                    <Label htmlFor={tcpPortInputId}>Port: </Label>
                </StackItem>
                <StackItem>
                    <TextField
                        id={tcpPortInputId}
                        width={300}
                        disabled={!device}
                        value={tcpPortValue}
                        onChange={(e, value) => setTcpPortValue(value!)}
                    />
                </StackItem>
                <StackItem>
                    <PrimaryButton
                        text="Enable"
                        disabled={!device}
                        onClick={enableTcp}
                    />
                </StackItem>
            </Stack>
            <StackItem>
                <PrimaryButton
                    text="Disable"
                    disabled={!device || tcpPort === undefined || tcpPort.length === 0}
                    onClick={disableTcp}
                />
            </StackItem>
        </>
    );
});
