import { DefaultButton, Dialog, Dropdown, IDropdownOption, PrimaryButton, ProgressIndicator, Stack, StackItem } from '@fluentui/react';
import { Adb, AdbBackend, InspectStream, pipeFrom } from '@yume-chan/adb';
import AdbDirectSocketsBackend from "@yume-chan/adb-backend-direct-sockets";
import AdbWebUsbBackend, { AdbWebUsbBackendWatcher } from '@yume-chan/adb-backend-webusb';
import AdbWsBackend from '@yume-chan/adb-backend-ws';
import AdbWebCredentialStore from '@yume-chan/adb-credential-web';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { globalState } from '../state';
import { CommonStackTokens, Icons } from '../utils';

const DropdownStyles = { dropdown: { width: '100%' } };

const CredentialStore = new AdbWebCredentialStore();

function _Connect(): JSX.Element | null {
    const [supported, setSupported] = useState(true);

    const [bytesIn, setBytesIn] = useState(0);
    const byteInAcc = useRef(0);

    useEffect(() => {
        const id = setInterval(() => {
            setBytesIn(byteInAcc.current);
            byteInAcc.current = 0;
        }, 1000);

        return () => {
            clearInterval(id);
        };
    }, []);

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
                globalState.showErrorDialog('Your browser does not support WebUSB standard, which is required for this site to work.\n\nLatest version of Google Chrome, Microsoft Edge, or other Chromium-based browsers are required.');
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

    const [wsBackendList, setWsBackendList] = useState<AdbWsBackend[]>([]);
    useEffect(() => {
        const savedList = localStorage.getItem('ws-backend-list');
        if (!savedList) {
            return;
        }

        const parsed = JSON.parse(savedList) as { address: string; }[];
        setWsBackendList(parsed.map(x => new AdbWsBackend(x.address)));
    }, []);

    const addWsBackend = useCallback(() => {
        const address = window.prompt('Enter the address of WebSockify server');
        if (!address) {
            return;
        }
        setWsBackendList(list => {
            const copy = list.slice();
            copy.push(new AdbWsBackend(address));
            window.localStorage.setItem('ws-backend-list', JSON.stringify(copy.map(x => ({ address: x.serial }))));
            return copy;
        });
    }, []);

    const [tcpBackendList, setTcpBackendList] = useState<AdbDirectSocketsBackend[]>([]);
    useEffect(() => {
        if (!AdbDirectSocketsBackend.isSupported()) {
            return;
        }

        const savedList = localStorage.getItem('tcp-backend-list');
        if (!savedList) {
            return;
        }

        const parsed = JSON.parse(savedList) as { address: string; port: number; }[];
        setTcpBackendList(parsed.map(x => new AdbDirectSocketsBackend(x.address, x.port)));
    }, []);

    const addTcpBackend = useCallback(() => {
        const host = window.prompt('Enter the address of device');
        if (!host) {
            return;
        }

        const port = window.prompt('Enter the port of device', '5555');
        if (!port) {
            return;
        }

        const portNumber = Number.parseInt(port, 10);

        setTcpBackendList(list => {
            const copy = list.slice();
            copy.push(new AdbDirectSocketsBackend(host, portNumber));
            window.localStorage.setItem(
                'tcp-backend-list',
                JSON.stringify(
                    copy.map(
                        x => ({
                            address: x.host,
                            port: x.port
                        })
                    )
                )
            );
            return copy;
        });
    }, []);

    const handleSelectedBackendChange = (
        e: React.FormEvent<HTMLDivElement>,
        option?: IDropdownOption,
    ) => {
        setSelectedBackend(option?.data as AdbBackend);
    };

    const addUsbBackend = useCallback(async () => {
        const backend = await AdbWebUsbBackend.requestDevice();
        setSelectedBackend(backend);
        await updateUsbBackendList();
    }, [updateUsbBackendList]);

    const connect = useCallback(async () => {
        try {
            if (selectedBackend) {
                let device: Adb | undefined;
                try {
                    setConnecting(true);

                    const streams = await selectedBackend.connect();

                    // Use `TransformStream` to intercept packets and log them
                    const readable = streams.readable
                        .pipeThrough(
                            new InspectStream(packet => {
                                globalState.appendLog('Incoming', packet);
                            })
                        );
                    const writable = pipeFrom(
                        streams.writable,
                        new InspectStream(packet => {
                            globalState.appendLog('Outgoing', packet);
                        })
                    );
                    device = await Adb.authenticate({ readable, writable }, CredentialStore, undefined);
                    device.disconnected.then(() => {
                        globalState.setDevice(undefined, undefined);
                    });
                    globalState.setDevice(selectedBackend, device);
                } catch (e) {
                    device?.dispose();
                    throw e;
                }
            }
        } catch (e: any) {
            globalState.showErrorDialog(e.message);
        } finally {
            setConnecting(false);
        }
    }, [selectedBackend]);
    const disconnect = useCallback(async () => {
        try {
            await globalState.device!.dispose();
            globalState.setDevice(undefined, undefined);
        } catch (e: any) {
            globalState.showErrorDialog(e.message);
        }
    }, []);

    const backendList = useMemo(
        () => ([] as AdbBackend[]).concat(usbBackendList, wsBackendList, tcpBackendList),
        [usbBackendList, wsBackendList, tcpBackendList]
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

    const addMenuProps = useMemo(() => {
        const items = [];

        items.push({
            key: 'usb',
            text: 'USB',
            onClick: addUsbBackend,
        });

        items.push({
            key: 'websocket',
            text: 'WebSocket',
            onClick: addWsBackend,
        });

        if (AdbDirectSocketsBackend.isSupported()) {
            items.push({
                key: 'direct-sockets',
                text: 'Direct Sockets TCP',
                onClick: addTcpBackend,
            });
        }

        return {
            items,
        };
    }, [addUsbBackend, addWsBackend, addTcpBackend]);

    return (
        <Stack
            tokens={{ childrenGap: 8, padding: '0 0 8px 8px' }}
        >
            <Dropdown
                disabled={!!globalState.device || backendOptions.length === 0}
                label="Available devices"
                placeholder="No available devices"
                options={backendOptions}
                styles={DropdownStyles}
                dropdownWidth={300}
                selectedKey={selectedBackend?.serial}
                onChange={handleSelectedBackendChange}
            />

            {!globalState.device
                ? (
                    <Stack horizontal tokens={CommonStackTokens}>
                        <StackItem grow shrink>
                            <PrimaryButton
                                iconProps={{ iconName: Icons.PlugConnected }}
                                text="Connect"
                                disabled={!selectedBackend}
                                primary={!!selectedBackend}
                                styles={{ root: { width: '100%' } }}
                                onClick={connect}
                            />
                        </StackItem>
                        <StackItem grow shrink>
                            <DefaultButton
                                iconProps={{ iconName: Icons.AddCircle }}
                                text="Add"
                                split
                                splitButtonAriaLabel="Add other connection type"
                                menuProps={addMenuProps}
                                disabled={!supported}
                                primary={!selectedBackend}
                                styles={{ root: { width: '100%' } }}
                                onClick={addUsbBackend}
                            />
                        </StackItem>
                    </Stack>
                )
                : (
                    <DefaultButton
                        iconProps={{ iconName: Icons.PlugDisconnected }}
                        text="Disconnect"
                        onClick={disconnect}
                    />
                )}

            {!!globalState.device && (<div>Transfer Rate: {bytesIn.toLocaleString()}B/s</div>)}

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
