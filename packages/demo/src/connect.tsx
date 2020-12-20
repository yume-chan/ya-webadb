import { DefaultButton, Dialog, Dropdown, IDropdownOption, PrimaryButton, ProgressIndicator, Stack, StackItem, TooltipHost } from '@fluentui/react';
import { Adb, AdbBackend, AdbLogger } from '@yume-chan/adb';
import AdbWebBackend, { AdbWebBackendWatcher } from '@yume-chan/adb-backend-web';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ErrorDialogContext } from './error-dialog';
import { CommonStackTokens } from './styles';
import { withDisplayName } from './utils';

const DropdownStyles = { dropdown: { width: '100%' } };

interface ConnectProps {
    device: Adb | undefined;

    logger?: AdbLogger;

    onDeviceChange: (device: Adb | undefined) => void;
}

export default withDisplayName('Connect')(({
    device,
    logger,
    onDeviceChange,
}: ConnectProps): JSX.Element | null => {
    const supported = AdbWebBackend.isSupported();

    const { show: showErrorDialog } = useContext(ErrorDialogContext);

    const [backendOptions, setBackendOptions] = useState<IDropdownOption[]>([]);
    const [selectedBackend, setSelectedBackend] = useState<AdbBackend | undefined>();
    useEffect(() => {
        if (!supported) {
            showErrorDialog('Your browser does not support WebUSB standard, which is required for this site to work.\n\nLatest version of Google Chrome (for Windows, macOS, Linux and Android), Microsoft Edge (for Windows and macOS), or other Chromium-based browsers should work.');
            return;
        }

        async function refresh() {
            const backendList = await AdbWebBackend.getDevices();

            const options = backendList.map(item => ({
                key: item.serial,
                text: `${item.serial} ${item.name ? `(${item.name})` : ''}`,
                data: item,
            }));
            setBackendOptions(options);

            setSelectedBackend(old => {
                if (old && backendList.some(item => item.serial === old.serial)) {
                    return old;
                }
                return backendList[0];
            });
        };

        refresh();
        const watcher = new AdbWebBackendWatcher(refresh);
        return () => watcher.dispose();
    }, []);

    const handleSelectedBackendChange = (
        _e: React.FormEvent<HTMLDivElement>,
        option?: IDropdownOption,
    ) => {
        setSelectedBackend(option?.data as AdbBackend);
    };

    const requestAccess = useCallback(async () => {
        const backend = await AdbWebBackend.requestDevice();
        if (backend) {
            setBackendOptions(list => {
                for (const item of list) {
                    if (item.key === backend.serial) {
                        setSelectedBackend(item.data);
                        return list;
                    }
                }

                setSelectedBackend(backend);
                return [...list, {
                    key: backend.serial,
                    text: `${backend.serial} ${backend.name ? `(${backend.name})` : ''}`,
                    data: backend,
                }];
            });
        }
    }, []);

    const [connecting, setConnecting] = useState(false);
    const connect = useCallback(async () => {
        try {
            if (selectedBackend) {
                const device = new Adb(selectedBackend, logger);
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
    }, [selectedBackend, logger, onDeviceChange]);
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
        <Stack
            tokens={{ childrenGap: 8, padding: '0 0 8px 8px' }}
        >
            <Dropdown
                disabled={!!device || backendOptions.length === 0}
                label="Available devices"
                placeholder="No available devices"
                options={backendOptions}
                styles={DropdownStyles}
                dropdownWidth={300}
                selectedKey={selectedBackend?.serial}
                onChange={handleSelectedBackendChange}
            />

            {!device ? (
                <Stack horizontal tokens={CommonStackTokens}>
                    <StackItem grow shrink>
                        <PrimaryButton
                            text="Connect"
                            disabled={!selectedBackend}
                            primary={!!selectedBackend}
                            styles={{ root: { width: '100%' } }}
                            onClick={connect}
                        />
                    </StackItem>
                    <StackItem grow shrink>
                        <TooltipHost
                            content="WebADB can't connect to anything without your explicit permission."
                        >
                            <DefaultButton
                                text="Add device"
                                disabled={!supported}
                                primary={!selectedBackend}
                                styles={{ root: { width: '100%' } }}
                                onClick={requestAccess}
                            />
                        </TooltipHost>
                    </StackItem>
                </Stack>
            ) : (
                    <DefaultButton text="Disconnect" onClick={disconnect} />
                )}

            <Dialog
                hidden={!connecting}
                dialogContentProps={{
                    title: 'Connecting...',
                    subText: 'Please authorize the connection on your device'
                }}
            >
                <ProgressIndicator />
            </Dialog>
        </Stack>
    );
});
