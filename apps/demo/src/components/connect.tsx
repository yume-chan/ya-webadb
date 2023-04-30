import {
    DefaultButton,
    Dialog,
    Dropdown,
    IDropdownOption,
    PrimaryButton,
    ProgressIndicator,
    Stack,
    StackItem,
} from "@fluentui/react";
import {
    Adb,
    AdbDaemonConnection,
    AdbDaemonTransport,
    AdbPacketData,
    AdbPacketInit,
} from "@yume-chan/adb";
import AdbDirectSocketsBackend from "@yume-chan/adb-backend-direct-sockets";
import {
    AdbDaemonWebUsbConnectionManager,
    AdbDaemonWebUsbConnectionWatcher,
} from "@yume-chan/adb-backend-webusb";
import AdbDaemonWebSocketConnection from "@yume-chan/adb-backend-ws";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";
import {
    Consumable,
    InspectStream,
    ReadableStream,
    WritableStream,
    pipeFrom,
} from "@yume-chan/stream-extra";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GLOBAL_STATE } from "../state";
import { CommonStackTokens, Icons } from "../utils";

const DropdownStyles = { dropdown: { width: "100%" } };

const CredentialStore = new AdbWebCredentialStore();

function _Connect(): JSX.Element | null {
    const [selected, setSelected] = useState<AdbDaemonConnection | undefined>();
    const [connecting, setConnecting] = useState(false);

    const [usbSupported, setUsbSupported] = useState(true);
    const [usbConnectionList, setUsbConnectionList] = useState<
        AdbDaemonConnection[]
    >([]);
    const updateUsbConnectionList = useCallback(async () => {
        const connections: AdbDaemonConnection[] =
            await AdbDaemonWebUsbConnectionManager.BROWSER!.getDevices();
        setUsbConnectionList(connections);
        return connections;
    }, []);

    useEffect(
        () => {
            // Only run on client
            const supported = !!AdbDaemonWebUsbConnectionManager.BROWSER;
            setUsbSupported(supported);

            if (!supported) {
                GLOBAL_STATE.showErrorDialog(
                    "Your browser does not support WebUSB standard, which is required for this site to work.\n\nLatest version of Google Chrome, Microsoft Edge, or other Chromium-based browsers are required."
                );
                return;
            }

            updateUsbConnectionList();

            const watcher = new AdbDaemonWebUsbConnectionWatcher(
                async (serial?: string) => {
                    const list = await updateUsbConnectionList();

                    if (serial) {
                        setSelected(
                            list.find((backend) => backend.serial === serial)
                        );
                        return;
                    }
                },
                window.navigator.usb
            );

            return () => watcher.dispose();
        },
        /* eslint-disable-next-line react-hooks/exhaustive-deps */
        []
    );

    const [webSocketConnectionList, setWebSocketConnectionList] = useState<
        AdbDaemonWebSocketConnection[]
    >([]);
    useEffect(() => {
        const savedList = localStorage.getItem("ws-backend-list");
        if (!savedList) {
            return;
        }

        const parsed = JSON.parse(savedList) as { address: string }[];
        setWebSocketConnectionList(
            parsed.map((x) => new AdbDaemonWebSocketConnection(x.address))
        );
    }, []);

    const addWebSocketConnection = useCallback(() => {
        const address = window.prompt("Enter the address of WebSockify server");
        if (!address) {
            return;
        }
        setWebSocketConnectionList((list) => {
            const copy = list.slice();
            copy.push(new AdbDaemonWebSocketConnection(address));
            window.localStorage.setItem(
                "ws-backend-list",
                JSON.stringify(copy.map((x) => ({ address: x.serial })))
            );
            return copy;
        });
    }, []);

    const [tcpConnectionList, setTcpConnectionList] = useState<
        AdbDirectSocketsBackend[]
    >([]);
    useEffect(() => {
        if (!AdbDirectSocketsBackend.isSupported()) {
            return;
        }

        const savedList = localStorage.getItem("tcp-backend-list");
        if (!savedList) {
            return;
        }

        const parsed = JSON.parse(savedList) as {
            address: string;
            port: number;
        }[];
        setTcpConnectionList(
            parsed.map((x) => new AdbDirectSocketsBackend(x.address, x.port))
        );
    }, []);

    const addTcpConnection = useCallback(() => {
        const host = window.prompt("Enter the address of device");
        if (!host) {
            return;
        }

        const port = window.prompt("Enter the port of device", "5555");
        if (!port) {
            return;
        }

        const portNumber = Number.parseInt(port, 10);

        setTcpConnectionList((list) => {
            const copy = list.slice();
            copy.push(new AdbDirectSocketsBackend(host, portNumber));
            window.localStorage.setItem(
                "tcp-backend-list",
                JSON.stringify(
                    copy.map((x) => ({
                        address: x.host,
                        port: x.port,
                    }))
                )
            );
            return copy;
        });
    }, []);

    const handleSelectedChange = (
        e: React.FormEvent<HTMLDivElement>,
        option?: IDropdownOption
    ) => {
        setSelected(option?.data as AdbDaemonConnection);
    };

    const addUsbConnection = useCallback(async () => {
        const connection =
            await AdbDaemonWebUsbConnectionManager.BROWSER!.requestDevice();
        setSelected(connection);
        await updateUsbConnectionList();
    }, [updateUsbConnectionList]);

    const connect = useCallback(async () => {
        if (!selected) {
            return;
        }

        setConnecting(true);

        let readable: ReadableStream<AdbPacketData>;
        let writable: WritableStream<Consumable<AdbPacketInit>>;
        try {
            const streams = await selected.connect();

            // Use `InspectStream`s to intercept and log packets
            readable = streams.readable.pipeThrough(
                new InspectStream((packet) => {
                    GLOBAL_STATE.appendLog("in", packet);
                })
            );

            writable = pipeFrom(
                streams.writable,
                new InspectStream((packet: Consumable<AdbPacketInit>) => {
                    GLOBAL_STATE.appendLog("out", packet.value);
                })
            );
        } catch (e: any) {
            GLOBAL_STATE.showErrorDialog(e);
            setConnecting(false);
            return;
        }

        async function dispose() {
            // Adb won't close the streams,
            // so manually close them.
            try {
                readable.cancel();
            } catch {}
            try {
                await writable.close();
            } catch {}
            GLOBAL_STATE.setDevice(undefined, undefined);
        }

        try {
            const device = new Adb(
                await AdbDaemonTransport.authenticate({
                    serial: selected.serial,
                    connection: { readable, writable },
                    credentialStore: CredentialStore,
                })
            );

            device.disconnected.then(
                async () => {
                    await dispose();
                },
                async (e) => {
                    GLOBAL_STATE.showErrorDialog(e);
                    await dispose();
                }
            );

            GLOBAL_STATE.setDevice(selected, device);
        } catch (e: any) {
            GLOBAL_STATE.showErrorDialog(e);
            await dispose();
        } finally {
            setConnecting(false);
        }
    }, [selected]);

    const disconnect = useCallback(async () => {
        try {
            await GLOBAL_STATE.device!.close();
        } catch (e: any) {
            GLOBAL_STATE.showErrorDialog(e);
        }
    }, []);

    const connectionList = useMemo(
        () =>
            ([] as AdbDaemonConnection[]).concat(
                usbConnectionList,
                webSocketConnectionList,
                tcpConnectionList
            ),
        [usbConnectionList, webSocketConnectionList, tcpConnectionList]
    );

    const connectionOptions = useMemo(() => {
        return connectionList.map((backend) => ({
            key: backend.serial,
            text: `${backend.serial} ${
                backend.name ? `(${backend.name})` : ""
            }`,
            data: backend,
        }));
    }, [connectionList]);

    useEffect(() => {
        setSelected((old) => {
            if (old) {
                const current = connectionList.find(
                    (backend) => backend.serial === old.serial
                );
                if (current) {
                    return current;
                }
            }

            return connectionList.length ? connectionList[0] : undefined;
        });
    }, [connectionList]);

    const addMenuProps = useMemo(() => {
        const items = [];

        if (usbSupported) {
            items.push({
                key: "usb",
                text: "USB",
                onClick: addUsbConnection,
            });
        }

        items.push({
            key: "websocket",
            text: "WebSocket",
            onClick: addWebSocketConnection,
        });

        if (AdbDirectSocketsBackend.isSupported()) {
            items.push({
                key: "direct-sockets",
                text: "Direct Sockets TCP",
                onClick: addTcpConnection,
            });
        }

        return {
            items,
        };
    }, [
        usbSupported,
        addUsbConnection,
        addWebSocketConnection,
        addTcpConnection,
    ]);

    return (
        <Stack tokens={{ childrenGap: 8, padding: "0 0 8px 8px" }}>
            <Dropdown
                disabled={
                    !!GLOBAL_STATE.device || connectionOptions.length === 0
                }
                label="Available devices"
                placeholder="No available devices"
                options={connectionOptions}
                styles={DropdownStyles}
                dropdownWidth={300}
                selectedKey={selected?.serial}
                onChange={handleSelectedChange}
            />

            {!GLOBAL_STATE.device ? (
                <Stack horizontal tokens={CommonStackTokens}>
                    <StackItem grow shrink>
                        <PrimaryButton
                            iconProps={{ iconName: Icons.PlugConnected }}
                            text="Connect"
                            disabled={!selected}
                            primary={!!selected}
                            styles={{ root: { width: "100%" } }}
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
                            disabled={!usbSupported}
                            primary={!selected}
                            styles={{ root: { width: "100%" } }}
                            onClick={addUsbConnection}
                        />
                    </StackItem>
                </Stack>
            ) : (
                <DefaultButton
                    iconProps={{ iconName: Icons.PlugDisconnected }}
                    text="Disconnect"
                    onClick={disconnect}
                />
            )}

            <Dialog
                hidden={!connecting}
                dialogContentProps={{
                    title: "Connecting...",
                    subText: "Please authorize the connection on your device",
                }}
            >
                <ProgressIndicator />
            </Dialog>
        </Stack>
    );
}

export const Connect = observer(_Connect);
