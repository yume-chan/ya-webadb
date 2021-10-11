import { DefaultButton, Dialog, Dropdown, IDropdownOption, PrimaryButton, ProgressIndicator, Stack, StackItem, TooltipHost } from '@fluentui/react';
import { Adb, AdbBackend } from '@yume-chan/adb';
import AdbWebUsbBackend, { AdbWebCredentialStore, AdbWebUsbBackendWatcher } from '@yume-chan/adb-backend-webusb';
import AdbWsBackend from '@yume-chan/adb-backend-ws';
import { observer } from 'mobx-react-lite';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { device, logger } from '../state';
import { CommonStackTokens } from '../utils';
import { ErrorDialogContext } from './error-dialog';

const DropdownStyles = { dropdown: { width: '100%' } };

const CredentialStore = new AdbWebCredentialStore();

function _Connect(): JSX.Element | null {
    const [supported, setSupported] = useState(true);

    const { show: showErrorDialog } = useContext(ErrorDialogContext);

    const [selectedBackend, setSelectedBackend] = useState<AdbBackend | undefined>();
    const [connecting, setConnecting] = useState(false);

    const [usbBackendList, setUsbBackendList] = useState<AdbBackend[]>([]);
    const updateUsbBackendList = useCallback(async () => {
        const backendList: AdbBackend[] = await AdbWebUsbBackend.getDevices();
        setUsbBackendList(backendList);
        return backendList;
    }, []);

    useEffect(
        () => {
            // Only run on client
            const supported = AdbWebUsbBackend.isSupported();
            setSupported(supported);

            if (!supported) {
                showErrorDialog('Your browser does not support WebUSB standard, which is required for this site to work.\n\nLatest version of Google Chrome, Microsoft Edge, or other Chromium-based browsers are required.');
                return;
            }

            updateUsbBackendList();

            const watcher = new AdbWebUsbBackendWatcher(async (serial?: string) => {
                const list = await updateUsbBackendList();

                if (serial) {
                    setSelectedBackend(list.find(backend => backend.serial === serial));
                    return;
                }
            });

            return () => watcher.dispose();
        },
        /* eslint-disable-next-line react-hooks/exhaustive-deps */
        []
    );

    const [wsBackendList, setWsBackendList] = useState<AdbBackend[]>([]);
    useEffect(() => {
        const intervalId = setInterval(async () => {
            if (connecting || device.current) {
                return;
            }

            const wsBackend = new AdbWsBackend("ws://localhost:15555");
            try {
                await wsBackend.connect();
                setWsBackendList([wsBackend]);
                setSelectedBackend(wsBackend);
            } catch {
                setWsBackendList([]);
            } finally {
                await wsBackend.dispose();
            }
        }, 5000);

        return () => {
            clearInterval(intervalId);
        };
    }, [connecting]);

    const handleSelectedBackendChange = (
        e: React.FormEvent<HTMLDivElement>,
        option?: IDropdownOption,
    ) => {
        setSelectedBackend(option?.data as AdbBackend);
    };

    const requestAccess = useCallback(async () => {
        const backend = await AdbWebUsbBackend.requestDevice();
        setSelectedBackend(backend);
        await updateUsbBackendList();
    }, [updateUsbBackendList]);

    const connect = useCallback(async () => {
        try {
            if (selectedBackend) {
                const adb = new Adb(selectedBackend, logger.logger);
                try {
                    setConnecting(true);
                    await adb.connect(CredentialStore);
                    device.setCurrent(adb);
                } catch (e) {
                    adb.dispose();
                    throw e;
                }
            }
        } catch (e: any) {
            showErrorDialog(e.message);
        } finally {
            setConnecting(false);
        }
    }, [showErrorDialog, selectedBackend]);
    const disconnect = useCallback(async () => {
        try {
            await device.current!.dispose();
            device.setCurrent(undefined);
        } catch (e: any) {
            showErrorDialog(e.message);
        }
    }, [showErrorDialog]);

    const backendList = useMemo(
        () => ([] as AdbBackend[]).concat(usbBackendList, wsBackendList),
        [usbBackendList, wsBackendList]
    );

    const backendOptions = useMemo(() => {
        return backendList.map(backend => ({
            key: backend.serial,
            text: `${backend.serial} ${backend.name ? `(${backend.name})` : ''}`,
            data: backend,
        }));
    }, [backendList]);

    useEffect(() => {
        setSelectedBackend(old => {
            if (old) {
                const current = backendList.find(backend => backend.serial === old.serial);
                if (current) {
                    return current;
                }
            }

            return backendList.length ? backendList[0] : undefined;
        });
    }, [backendList]);

    return (
        <Stack
            tokens={{ childrenGap: 8, padding: '0 0 8px 8px' }}
        >
            <Dropdown
                disabled={!!device.current || backendOptions.length === 0}
                label="Available devices"
                placeholder="No available devices"
                options={backendOptions}
                styles={DropdownStyles}
                dropdownWidth={300}
                selectedKey={selectedBackend?.serial}
                onChange={handleSelectedBackendChange}
            />

            {!device.current ? (
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
};

export const Connect = observer(_Connect);
