import { Link, Nav, Separator, Stack, StackItem, Text } from '@fluentui/react';
import { initializeIcons } from '@uifabric/icons';
import { Adb } from '@yume-chan/adb';
import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { HashRouter, Redirect, useLocation } from 'react-router-dom';
import Connect from './connect';
import './index.css';
import { CacheRoute, CacheSwitch } from './router';
import FileManager from './routes/file-manager';
import Shell from './routes/shell';
import TcpIp from './routes/tcp-ip';

initializeIcons();

interface RouteInfo {
    path: string;

    exact?: boolean;

    name: string;

    children: JSX.Element | null;
}

function App(): JSX.Element | null {
    const location = useLocation();

    const [device, setDevice] = useState<Adb | undefined>();

    const routes = useMemo((): RouteInfo[] => [
        {
            path: '/',
            exact: true,
            name: 'Introduction',
            children: (
                <>
                    <Text block>
                        This demo can connect to your Android devices using the{' '}
                        <Link href="https://developer.mozilla.org/en-US/docs/Web/API/USB" target="_blank">WebUSB</Link>{' '}
                        API.
                    </Text>
                    <Text block>
                        The latest version of Google Chrome (or Microsoft Edge) is recommended for best compatibility.
                    </Text>
                    <Text block styles={{ root: { fontWeight: '600' } }}>
                        Windows user?
                    </Text>
                    <Text block>
                        The experimental new backend is required. Enable from  {' '}
                        <Link href="chrome://flags/#new-usb-backend">
                            chrome://flags/#new-usb-backend
                        </Link>
                    </Text>
                    <Text block styles={{ root: { fontWeight: '600' } }}>
                        Got "Unable to claim interface"?
                    </Text>
                    <Text block >
                        1. Make sure ADB server is not running (run `adb kill-server` to stop it).<br />
                        2. Make sure no other Android management tools are running
                    </Text>
                    <Text block styles={{ root: { fontWeight: '600' } }}>
                        Got "Access denied"?
                    </Text>
                    <Text block >
                        If you have a Samsung device, it's caused by the custom driver. See {' '}
                        <Link href="https://bugs.chromium.org/p/chromium/issues/detail?id=1127206">
                            https://bugs.chromium.org/p/chromium/issues/detail?id=1127206
                        </Link>
                    </Text>
                </>
            )
        },
        {
            path: '/device-info',
            name: 'Device Info',
            children: (
                <>
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
                </>
            )
        },
        {
            path: '/adb-over-wifi',
            name: 'ADB over WiFi',
            children: (
                <TcpIp device={device} />
            )
        },
        {
            path: '/shell',
            name: 'Interactive Shell',
            children: (
                <Shell device={device} />
            ),
        },
        {
            path: '/file-manager',
            name: 'File Manager',
            children: (
                <FileManager device={device} />
            ),
        },
    ], [device]);

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
                                links: routes.map(route => ({
                                    key: route.path,
                                    name: route.name,
                                    url: `#${route.path}`,
                                })),
                            }]}
                            selectedKey={location.pathname}
                        />
                    </StackItem>
                    <StackItem grow styles={{ root: { minHeight: 0, overflow: 'hidden' } }}>
                        <CacheSwitch>
                            {routes.map<React.ReactElement>(route => (
                                <CacheRoute exact={route.exact} path={route.path}>
                                    {route.children}
                                </CacheRoute>
                            ))}

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
