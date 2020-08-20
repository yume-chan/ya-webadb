import { DefaultButton, Dialog, DialogFooter, DialogType, Link, Label, MessageBar, Nav, PrimaryButton, ProgressIndicator, Separator, Stack, StackItem, Text, TextField, IStackItemComponent } from '@fluentui/react';
import { useId } from '@uifabric/react-hooks';
import { WebAdb, WebUsbTransportation } from '@yume-chan/webadb';
import { initializeIcons } from 'office-ui-fabric-react/lib/Icons';
import React, { useCallback } from 'react';
import ReactDOM from 'react-dom';
import { HashRouter, Redirect, Route, useLocation } from 'react-router-dom';
import './index.css';
import Shell from './Shell';

initializeIcons();

function App(): JSX.Element | null {
    const location = useLocation();
    const [device, setDevice] = React.useState<WebAdb | undefined>();

    const [connecting, setConnecting] = React.useState(false);
    const [connectError, setConnectError] = React.useState<string | undefined>(undefined);
    const handleConnectClick = React.useCallback(async () => {
        try {
            const transportation = await WebUsbTransportation.pickDevice();
            if (transportation) {
                const device = new WebAdb(transportation);
                setConnecting(true);
                await device.connect();
                setDevice(device);
            }
        } catch (e) {
            setConnectError(e.message);
        } finally {
            setConnecting(false);
        }
    }, []);
    const disconnect = useCallback(async () => {
        try {
            await device?.dispose();
        } catch (e) {
            console.log(e);
        }
        setDevice(undefined);
    }, [device]);

    const [tcpPort, setTcpPort] = React.useState<number | undefined>();
    const queryTcpPort = React.useCallback(async () => {
        if (!device) {
            return;
        }

        const result = await device.shell('getprop service.adb.tcp.port');
        setTcpPort(Number.parseInt(result, 10));
    }, [device]);

    const [tcpPortValue, setTcpPortValue] = React.useState('5555');
    const tcpPortInputId = useId('tcpPort');
    const enableTcp = React.useCallback(async () => {
        if (!device) {
            return;
        }

        const result = await device.tcpip(Number.parseInt(tcpPortValue, 10));
        console.log(result);
    }, [device, tcpPortValue]);

    const disableTcp = React.useCallback(async () => {
        if (!device) {
            return;
        }

        const result = await device.usb();
        console.log(result);
    }, [device]);

    return (
        <Stack verticalFill>
            <StackItem tokens={{ padding: 8 }}>
                <Text variant="xxLarge">WebADB Demo</Text>
            </StackItem>
            <StackItem>
                <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8, padding: 8 }}>
                    {!device && <StackItem>
                        <PrimaryButton text="Connect" onClick={handleConnectClick} />
                    </StackItem>}
                    {device && <StackItem>
                        <DefaultButton text="Disconnect" onClick={disconnect} />
                    </StackItem>}
                    <StackItem>
                        {device && `Connected to ${device.name}`}
                    </StackItem>
                </Stack>
            </StackItem>
            <StackItem>
                <Separator />
            </StackItem>
            <StackItem grow styles={{ root: { minHeight: 0 } }}>
                <Stack horizontal verticalFill tokens={{ childrenGap: 8 }}>
                    <StackItem>
                        <Nav
                            styles={{ root: { width: 250 } }}
                            groups={[{
                                links: [
                                    { key: '/intro', name: 'Introduction', url: '#/intro' },
                                    { key: '/adb-over-wifi', name: 'ADB over WiFi', url: '#/adb-over-wifi' },
                                    { key: '/shell', name: 'Interactive Shell', url: '#/shell' },
                                ]
                            }]}
                            selectedKey={location.pathname}
                        />
                    </StackItem>
                    <StackItem grow styles={{ root: { minHeight: 0 } }}>
                        <Route path="/intro">
                            <Stack tokens={{ childrenGap: 8, padding: 8 }}>
                                <Text block>
                                    This demo can connect to your Android devices using the{' '}
                                    <Link href="https://developer.mozilla.org/en-US/docs/Web/API/USB" target="_blank">WebUSB</Link>{' '}
                                    API.
                                </Text>
                                <Text block>
                                    Before start, please make sure your adb server is not running (`adb kill-server`), as there can be only one connection to your device at same time.
                                </Text>
                            </Stack>
                        </Route>
                        <Route path="/adb-over-wifi">
                            <Stack verticalFill tokens={{ childrenGap: 8, padding: 8 }}>
                                <StackItem>
                                    <MessageBar >
                                        <Text>Although WebADB can enable ADB over WiFi for you, it can't connect to your device wirelessly.</Text>
                                    </MessageBar>
                                </StackItem>
                                <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
                                    <StackItem>
                                        <PrimaryButton text="Update Status" disabled={!device} onClick={queryTcpPort} />
                                    </StackItem>
                                    <StackItem>
                                        {tcpPort !== undefined &&
                                            (tcpPort !== 0
                                                ? `Enabled at port ${tcpPort}`
                                                : 'Disabled')}
                                    </StackItem>
                                </Stack>
                                <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
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
                                        disabled={!device || tcpPort === undefined || tcpPort === 0}
                                        onClick={disableTcp}
                                    />
                                </StackItem>
                            </Stack>
                        </Route>
                        <Route path="/shell" >
                            {({ match }) => (
                                <Stack
                                    verticalFill
                                    styles={{ root: { visibility: match ? 'visible' : 'hidden' } }}
                                    tokens={{ childrenGap: 8, padding: 8 }}
                                >
                                    <StackItem grow styles={{ root: { minHeight: 0 } }}>
                                        <Shell device={device} />
                                    </StackItem>
                                </Stack>
                            )}
                        </Route>
                    </StackItem>
                </Stack>
            </StackItem>

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
                hidden={!connectError}
                dialogContentProps={{
                    type: DialogType.normal,
                    title: 'Connection Error',
                    subText: connectError,
                }}
            >
                <DialogFooter>
                    <PrimaryButton text="OK" onClick={() => setConnectError(undefined)} />
                </DialogFooter>
            </Dialog>
        </Stack>
    )
}

ReactDOM.render(
    <HashRouter>
        <App />
        <Redirect to='/intro' />
    </HashRouter>,
    document.getElementById('container'));

// document.getElementById('start')!.onclick = async () => {
//     const transportation = await WebUsbTransportation.pickDevice();
//     const device = new WebAdb(transportation);

//     const textEncoder = new TextEncoder();

//     const output = await device.shell('echo', '1');
//     console.log(output);

//     const shell = await device.shell();

//     const terminal = new Terminal({
//         scrollback: 9001,
//     });

//     const searchAddon = new SearchAddon();
//     terminal.loadAddon(searchAddon);

//     const keyword = document.getElementById('search-keyword')! as HTMLInputElement;
//     keyword.addEventListener('input', () => {
//         searchAddon.findNext(keyword.value, { incremental: true });
//     });

//     const next = document.getElementById('search-next')!;
//     next.addEventListener('click', () => {
//         searchAddon.findNext(keyword.value);
//     });

//     const prev = document.getElementById('search-prev')!;
//     prev.addEventListener('click', () => {
//         searchAddon.findPrevious(keyword.value);
//     });

//     terminal.open(document.getElementById('terminal')!);
//     terminal.onData(data => {
//         const { buffer } = textEncoder.encode(data);
//         shell.write(buffer);
//     });
//     shell.onData(data => {
//         terminal.write(new Uint8Array(data));
//     });
// };
