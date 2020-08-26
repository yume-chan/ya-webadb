import { Label, Link, MessageBar, Nav, PrimaryButton, Separator, Stack, StackItem, Text, TextField } from '@fluentui/react';
import { useId } from '@uifabric/react-hooks';
import { Adb } from '@yume-chan/adb';
import { initializeIcons } from 'office-ui-fabric-react/lib/Icons';
import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { HashRouter, Redirect, Route, Switch, useLocation } from 'react-router-dom';
import Connect from './Connect';
import './index.css';
import Shell from './Shell';

initializeIcons();

function App(): JSX.Element | null {
    const location = useLocation();

    const [device, setDevice] = useState<Adb | undefined>();

    const [tcpPort, setTcpAddresses] = useState<string[] | undefined>();
    useEffect(() => {
        if (!device) {
            setTcpAddresses(undefined);
        }
    }, [device]);
    const queryTcpPort = useCallback(async () => {
        if (!device) {
            return;
        }

        const result = await device.getDaemonTcpAddresses();
        setTcpAddresses(result);
    }, [device]);

    const [tcpPortValue, setTcpPortValue] = useState('5555');
    const tcpPortInputId = useId('tcpPort');
    const enableTcp = useCallback(async () => {
        if (!device) {
            return;
        }

        const result = await device.setDaemonTcpPort(Number.parseInt(tcpPortValue, 10));
        console.log(result);
    }, [device, tcpPortValue]);

    const disableTcp = useCallback(async () => {
        if (!device) {
            return;
        }

        const result = await device.disableDaemonTcp();
        console.log(result);
    }, [device]);

    return (
        <Stack verticalFill>
            <StackItem tokens={{ padding: 8 }}>
                <Text variant="xxLarge">WebADB Demo</Text>
            </StackItem>
            <StackItem>
                <Connect device={device} onDeviceChange={setDevice} />
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
                                    { key: '/device-info', name: 'Device Info', url: '#/device-info' },
                                    { key: '/adb-over-wifi', name: 'ADB over WiFi', url: '#/adb-over-wifi' },
                                    { key: '/shell', name: 'Interactive Shell', url: '#/shell' },
                                ]
                            }]}
                            selectedKey={location.pathname}
                        />
                    </StackItem>
                    <StackItem grow styles={{ root: { minHeight: 0, overflow: 'hidden' } }}>
                        <Switch>
                            <Route path="/intro">
                                <Stack
                                    verticalFill
                                    styles={{ root: { overflow: 'auto' } }}
                                    tokens={{ childrenGap: 8, padding: 8 }}
                                >
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
                            <Route path='/device-info'>
                                <Stack
                                    verticalFill
                                    styles={{ root: { overflow: 'auto' } }}
                                    tokens={{ childrenGap: 8, padding: 8 }}
                                >
                                    <StackItem>
                                        Product: {device?.product}<br />
                                        Model: {device?.model}<br />
                                        Device: {device?.device}<br />
                                        Features: {device?.features?.join(',')}<br />
                                    </StackItem>
                                </Stack>
                            </Route>
                            <Route path="/adb-over-wifi">
                                <Stack
                                    verticalFill
                                    styles={{ root: { overflow: 'auto' } }}
                                    tokens={{ childrenGap: 8, padding: 8 }}
                                >
                                    <StackItem>
                                        <MessageBar >
                                            <Text>Although WebADB can enable ADB over WiFi for you, it can't connect to your device wirelessly.</Text>
                                        </MessageBar>
                                    </StackItem>
                                    <StackItem>
                                        <MessageBar >
                                            <Text>Your device will disconnect after changing ADB over WiFi config.</Text>
                                        </MessageBar>
                                    </StackItem>
                                    <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
                                        <StackItem>
                                            <PrimaryButton text="Update Status" disabled={!device} onClick={queryTcpPort} />
                                        </StackItem>
                                        <StackItem>
                                            {tcpPort !== undefined &&
                                                (tcpPort.length !== 0
                                                    ? `Enabled at ${tcpPort.join(', ')}`
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
                                            disabled={!device || tcpPort === undefined || tcpPort.length === 0}
                                            onClick={disableTcp}
                                        />
                                    </StackItem>
                                </Stack>
                            </Route>
                            <Route path="/shell" />
                            <Redirect to="/intro" />
                        </Switch>
                        <Route path="/shell" >
                            {({ match }) => (
                                <Stack
                                    verticalFill
                                    styles={{ root: { overflow: 'auto', visibility: match ? 'visible' : 'collapse' } }}
                                    tokens={{ childrenGap: 8, padding: 8 }}
                                >
                                    <StackItem grow styles={{ root: { minHeight: 0 } }}>
                                        <Shell device={device} visible={!!match} />
                                    </StackItem>
                                </Stack>
                            )}
                        </Route>
                    </StackItem>
                </Stack>
            </StackItem>
        </Stack>
    )
}

ReactDOM.render(
    <HashRouter>
        <App />
    </HashRouter>,
    document.getElementById('container')
);

// (new WebAdb({} as any) as any).getPublicKey();

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
