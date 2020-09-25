import { Nav, Separator, Stack, StackItem, Text } from '@fluentui/react';
import { initializeIcons } from '@uifabric/icons';
import { Adb } from '@yume-chan/adb';
import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { HashRouter, Redirect, useLocation } from 'react-router-dom';
import Connect from './connect';
import ErrorDialogProvider from './error-dialog';
import './index.css';
import { CacheRoute, CacheSwitch } from './router';
import FileManager from './routes/file-manager';
import FrameBuffer from './routes/framebuffer';
import Intro from './routes/intro';
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
                <Intro />
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
        {
            path: '/framebuffer',
            name: 'Screen Capture',
            children: (
                <FrameBuffer device={device} />
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
        <ErrorDialogProvider>
            <App />
        </ErrorDialogProvider>
    </HashRouter>,
    document.getElementById('container')
);
