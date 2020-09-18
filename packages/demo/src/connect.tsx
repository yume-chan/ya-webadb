import { DefaultButton, Dialog, PrimaryButton, ProgressIndicator, Stack, StackItem } from '@fluentui/react';
import { Adb } from '@yume-chan/adb';
import AdbWebBackend from '@yume-chan/adb-backend-web';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ErrorDialogContext } from './error-dialog';
import withDisplayName from './with-display-name';

interface ConnectProps {
    device: Adb | undefined;

    onDeviceChange: (device: Adb | undefined) => void;
}

export default withDisplayName('Connect', ({
    device,
    onDeviceChange,
}: ConnectProps): JSX.Element | null => {
    const { show: showErrorDialog } = useContext(ErrorDialogContext);

    const [connecting, setConnecting] = useState(false);
    const connect = useCallback(async () => {
        try {
            const backend = await AdbWebBackend.pickDevice();
            if (backend) {
                const device = new Adb(backend);
                try {
                    setConnecting(true);
                    await device.connect();
                    onDeviceChange(device);
                } catch (e) {
                    device.dispose();
                    throw e;
                }
            }
        } catch (e) {
            showErrorDialog(e.message);
        } finally {
            setConnecting(false);
        }
    }, [onDeviceChange]);
    const disconnect = useCallback(async () => {
        try {
            await device!.dispose();
            onDeviceChange(undefined);
        } catch (e) {
            showErrorDialog(e.message);
        }
    }, [device]);
    useEffect(() => {
        return device?.onDisconnected(() => {
            onDeviceChange(undefined);
        });
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
        </>
    );
});
