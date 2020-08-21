import { DefaultButton, Dialog, DialogFooter, DialogType, PrimaryButton, ProgressIndicator, Stack, StackItem } from '@fluentui/react';
import { useBoolean } from '@uifabric/react-hooks';
import { WebAdb, WebUsbTransportation } from '@yume-chan/webadb';
import React, { useCallback, useEffect, useState } from 'react';

interface ConnectProps {
    device: WebAdb | undefined;

    onDeviceChange: (device: WebAdb | undefined) => void;
}

export default function Connect({
    device,
    onDeviceChange,
}: ConnectProps): JSX.Element | null {
    const [connecting, setConnecting] = useState(false);

    const [errorDialogVisible, { setTrue: showErrorDialog, setFalse: hideErrorDialog }] = useBoolean(false);
    const [errorMessage, setErrorMessage] = useState<string | undefined>();

    const connect = useCallback(async () => {
        try {
            const transportation = await WebUsbTransportation.pickDevice();
            if (transportation) {
                const device = new WebAdb(transportation);
                setConnecting(true);
                await device.connect();
                onDeviceChange(device);
            }
        } catch (e) {
            setErrorMessage(e.message);
            showErrorDialog();
        } finally {
            setConnecting(false);
        }
    }, [onDeviceChange]);

    const disconnect = useCallback(async () => {
        try {
            await device!.dispose();
            onDeviceChange(undefined);
        } catch (e) {
            setErrorMessage(e.message);
            showErrorDialog();
        }
    }, [device]);

    useEffect(() => {
        function handler(e: USBConnectionEvent) {
            if (e.device.productName === device?.name) {
                onDeviceChange(undefined);
            }
        }

        window.navigator.usb.addEventListener('disconnect', handler);

        return () => {
            window.navigator.usb.removeEventListener('disconnect', handler);
        };
    }, [device, onDeviceChange]);

    return (
        <>
            <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8, padding: 8 }}>
                {!device && <StackItem>
                    <PrimaryButton text="Connect" onClick={connect} />
                </StackItem>}
                {device && <StackItem>
                    <DefaultButton text="Disconnect" onClick={disconnect} />
                </StackItem>}
                <StackItem>
                    {device && `Connected to ${device.name}`}
                </StackItem>
            </Stack>

            <Dialog
                hidden={!connecting}
                dialogContentProps={{
                    title: 'Connecting',
                    subText: 'Please authorize the connection on your device'
                }}
            >
                <ProgressIndicator />
            </Dialog>

            <Dialog
                hidden={!errorDialogVisible}
                dialogContentProps={{
                    type: DialogType.normal,
                    title: 'Error',
                    subText: errorMessage,
                }}
            >
                <DialogFooter>
                    <PrimaryButton text="OK" onClick={hideErrorDialog} />
                </DialogFooter>
            </Dialog>
        </>
    );
}
