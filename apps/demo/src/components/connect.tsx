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
import { Adb, AdbBackend, AdbPacketData, AdbPacketInit } from "@yume-chan/adb";
import AdbDirectSocketsBackend from "@yume-chan/adb-backend-direct-sockets";
import {
    AdbWebUsbBackendManager,
    AdbWebUsbBackendWatcher,
} from "@yume-chan/adb-backend-webusb";
import AdbWsBackend from "@yume-chan/adb-backend-ws";
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
    const [supported, setSupported] = useState(true);

    const [selectedBackend, setSelectedBackend] = useState<
        AdbBackend | undefined
    >();
    const [connecting, setConnecting] = useState(false);

    const [usbBackendList, setUsbBackendList] = useState<AdbBackend[]>([]);
    const updateUsbBackendList = useCallback(async () => {
        const backendList: AdbBackend[] =
            await AdbWebUsbBackendManager.BROWSER!.getDevices();
        setUsbBackendList(backendList);
        return backendList;
    }, []);

    useEffect(
        () => {
            // Only run on client
            const supported = !!AdbWebUsbBackendManager.BROWSER;
            setSupported(supported);

            if (!supported) {
                GLOBAL_STATE.showErrorDialog(
                    "Your browser does not support WebUSB standard, which is required for this site to work.\n\nLatest version of Google Chrome, Microsoft Edge, or other Chromium-based browsers are required."
                );
                return;
            }

            updateUsbBackendList();

            const watcher = new AdbWebUsbBackendWatcher(
                async (serial?: string) => {
                    const list = await updateUsbBackendList();

                    if (serial) {
                        setSelectedBackend(
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

    const [wsBackendList, setWsBackendList] = useState<AdbWsBackend[]>([]);
    useEffect(() => {
        const savedList = localStorage.getItem("ws-backend-list");
        if (!savedList) {
            return;
        }

        const parsed = JSON.parse(savedList) as { address: string }[];
        setWsBackendList(parsed.map((x) => new AdbWsBackend(x.address)));
    }, []);

    const addWsBackend = useCallback(() => {
        const address = window.prompt("Enter the address of WebSockify server");
        if (!address) {
            return;
        }
        setWsBackendList((list) => {
            const copy = list.slice();
            copy.push(new AdbWsBackend(address));
            window.localStorage.setItem(
                "ws-backend-list",
                JSON.stringify(copy.map((x) => ({ address: x.serial })))
            );
            return copy;
        });
    }, []);

    const [tcpBackendList, setTcpBackendList] = useState<
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
        setTcpBackendList(
            parsed.map((x) => new AdbDirectSocketsBackend(x.address, x.port))
        );
    }, []);

    const addTcpBackend = useCallback(() => {
        const host = window.prompt("Enter the address of device");
        if (!host) {
            return;
        }

        const port = window.prompt("Enter the port of device", "5555");
        if (!port) {
            return;
        }

        const portNumber = Number.parseInt(port, 10);

        setTcpBackendList((list) => {
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

    const handleSelectedBackendChange = (
        e: React.FormEvent<HTMLDivElement>,
        option?: IDropdownOption
    ) => {
        setSelectedBackend(option?.data as AdbBackend);
    };

    const addUsbBackend = useCallback(async () => {
        const backend = await AdbWebUsbBackendManager.BROWSER!.requestDevice();
        setSelectedBackend(backend);
        await updateUsbBackendList();
    }, [updateUsbBackendList]);

    const connect = useCallback(async () => {
        if (!selectedBackend) {
            return;
        }

        setConnecting(true);

        let readable: ReadableStream<AdbPacketData>;
        let writable: WritableStream<Consumable<AdbPacketInit>>;
        try {
            const streams = await selectedBackend.connect();

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
            const device = await Adb.authenticate(
                { readable, writable },
                CredentialStore,
                undefined
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

            GLOBAL_STATE.setDevice(selectedBackend, device);
        } catch (e: any) {
            GLOBAL_STATE.showErrorDialog(e);
            await dispose();
        } finally {
            setConnecting(false);
        }
    }, [selectedBackend]);

    const disconnect = useCallback(async () => {
        try {
            await GLOBAL_STATE.device!.close();
        } catch (e: any) {
            GLOBAL_STATE.showErrorDialog(e);
        }
    }, []);

    const backendList = useMemo(
        () =>
            ([] as AdbBackend[]).concat(
                usbBackendList,
                wsBackendList,
                tcpBackendList
            ),
        [usbBackendList, wsBackendList, tcpBackendList]
    );

    const backendOptions = useMemo(() => {
        return backendList.map((backend) => ({
            key: backend.serial,
            text: `${backend.serial} ${
                backend.name ? `(${backend.name})` : ""
            }`,
            data: backend,
        }));
    }, [backendList]);

    useEffect(() => {
        setSelectedBackend((old) => {
            if (old) {
                const current = backendList.find(
                    (backend) => backend.serial === old.serial
                );
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
            key: "usb",
            text: "USB",
            onClick: addUsbBackend,
        });

        items.push({
            key: "websocket",
            text: "WebSocket",
            onClick: addWsBackend,
        });

        if (AdbDirectSocketsBackend.isSupported()) {
            items.push({
                key: "direct-sockets",
                text: "Direct Sockets TCP",
                onClick: addTcpBackend,
            });
        }

        return {
            items,
        };
    }, [addUsbBackend, addWsBackend, addTcpBackend]);

    return (
        <Stack tokens={{ childrenGap: 8, padding: "0 0 8px 8px" }}>
            <Dropdown
                disabled={!!GLOBAL_STATE.device || backendOptions.length === 0}
                label="Available devices"
                placeholder="No available devices"
                options={backendOptions}
                styles={DropdownStyles}
                dropdownWidth={300}
                selectedKey={selectedBackend?.serial}
                onChange={handleSelectedBackendChange}
            />

            {!GLOBAL_STATE.device ? (
                <Stack horizontal tokens={CommonStackTokens}>
                    <StackItem grow shrink>
                        <PrimaryButton
                            iconProps={{ iconName: Icons.PlugConnected }}
                            text="Connect"
                            disabled={!selectedBackend}
                            primary={!!selectedBackend}
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
                            disabled={!supported}
                            primary={!selectedBackend}
                            styles={{ root: { width: "100%" } }}
                            onClick={addUsbBackend}
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
