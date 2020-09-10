import { Label, Link, MessageBar, Nav, PrimaryButton, Separator, Stack, StackItem, Text, TextField } from '@fluentui/react';
import { initializeIcons } from '@uifabric/icons';
import { useId } from '@uifabric/react-hooks';
import { Adb } from '@yume-chan/adb';
import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { HashRouter, Redirect, useLocation } from 'react-router-dom';
import Connect from './connect';
import FileManager from './file-manager';
import './index.css';
import { CacheRoute, CacheSwitch } from './router';
import Shell from './shell';

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
                                    { key: '/', name: 'Introduction', url: '#/' },
                                    { key: '/device-info', name: 'Device Info', url: '#/device-info' },
                                    { key: '/adb-over-wifi', name: 'ADB over WiFi', url: '#/adb-over-wifi' },
                                    { key: '/shell', name: 'Interactive Shell', url: '#/shell' },
                                    { key: '/file-manager', name: 'File Manager', url: '#/file-manager' },
                                ]
                            }]}
                            selectedKey={location.pathname}
                        />
                    </StackItem>
                    <StackItem grow styles={{ root: { minHeight: 0, overflow: 'hidden' } }}>
                        <CacheSwitch>
                            <CacheRoute exact path="/">
                                <Text block>
                                    This demo can connect to your Android devices using the{' '}
                                    <Link href="https://developer.mozilla.org/en-US/docs/Web/API/USB" target="_blank">WebUSB</Link>{' '}
                                    API.
                                </Text>
                                <Text block>
                                    Before start, please make sure your adb server is not running (`adb kill-server`), as there can be only one connection to your device at same time.
                                </Text>
                            </CacheRoute>
                            <CacheRoute path='/device-info'>
                                <StackItem>
                                    Product: {device?.product}
                                </StackItem>
                                <StackItem>
                                    Model: {device?.model}
                                </StackItem>
                                <StackItem>
                                    Device: {device?.device}
                                </StackItem>
                                <StackItem>
                                    Features: {device?.features?.join(',')}
                                </StackItem>
                            </CacheRoute>
                            <CacheRoute path="/adb-over-wifi">
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
                            </CacheRoute>

                            <CacheRoute path="/shell" >
                                <Shell device={device} />
                            </CacheRoute>

                            <CacheRoute path="/file-manager" >
                                <FileManager device={device} />
                            </CacheRoute>

                            <Redirect to="/" />
                        </CacheSwitch>
                    </StackItem>
                </Stack>
            </StackItem>
        </Stack>
    );
}

ReactDOM.render(
    <HashRouter>
        <App />
    </HashRouter>,
    document.getElementById('container')
);
