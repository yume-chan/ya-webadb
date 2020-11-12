import { Nav, Stack, StackItem } from '@fluentui/react';
import { initializeIcons } from '@uifabric/icons';
import { Adb } from '@yume-chan/adb';
import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { HashRouter, Redirect, useLocation } from 'react-router-dom';
import Connect from './connect';
import ErrorDialogProvider from './error-dialog';
import './index.css';
import { CacheRoute, CacheSwitch } from './router';
import { FileManager, FrameBuffer, Install, Intro, Scrcpy, Shell, TcpIp } from './routes';

initializeIcons();

interface RouteInfo {
    path: string;

    exact?: boolean;

    name: string;

    children: JSX.Element | null;

    noCache?: boolean;
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
            path: '/install',
            name: 'Install APK',
            children: (
                <Install device={device} />
            ),
        },
        {
            path: '/framebuffer',
            name: 'Screen Capture',
            children: (
                <FrameBuffer device={device} />
            ),
        },
        {
            path: '/scrcpy',
            name: 'Scrcpy',
            noCache: true,
            children: (
                <Scrcpy device={device} />
            ),
        },
    ], [device]);

    return (
        <Stack verticalFill>
            <StackItem>
                <div
                    style={{
                        padding: '4px 0',
                        fontSize: 20,
                        textAlign: 'center',
                        borderBottom: '1px solid rgb(243, 242, 241)',
                    }}
                >
                    WebADB Demo
                </div>
            </StackItem>
            <StackItem grow styles={{ root: { minHeight: 0, overflow: 'hidden' } }}>
                <Stack horizontal verticalFill>
                    <StackItem styles={{
                        root: {
                            paddingRight: 8,
                            borderRight: '1px solid rgb(243, 242, 241)',
                        }
                    }}>
                        <Connect device={device} onDeviceChange={setDevice} />

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
                    <StackItem grow>
                        <CacheSwitch>
                            {routes.map<React.ReactElement>(route => (
                                <CacheRoute
                                    exact={route.exact}
                                    path={route.path}
                                    noCache={route.noCache}>
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
