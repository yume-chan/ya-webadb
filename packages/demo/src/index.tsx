import { initializeIcons } from '@fluentui/font-icons-mdl2';
import { IconButton, mergeStyles, mergeStyleSets, Nav, Stack, StackItem } from '@fluentui/react';
import { Adb } from '@yume-chan/adb';
import { ReactElement, useCallback, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { HashRouter, Redirect, useLocation } from 'react-router-dom';
import { AdbEventLogger, CacheRoute, CacheSwitch, Connect, ErrorDialogProvider, Logger, LoggerContextProvider, ToggleLogger } from './components';
import './index.css';
import { DeviceInfo, FileManager, FrameBuffer, Install, Intro, Scrcpy, Shell, TcpIp } from './routes';

initializeIcons();

const classNames = mergeStyleSets({
    'title-container': {
        borderBottom: '1px solid rgb(243, 242, 241)',
    },
    title: {
        padding: '4px 0',
        fontSize: 20,
        textAlign: 'center',
    },
    'left-column': {
        width: 250,
        paddingRight: 8,
        borderRight: '1px solid rgb(243, 242, 241)',
        overflow: 'auto',
    },
    'right-column': {
        borderLeft: '1px solid rgb(243, 242, 241)',
    }
});

interface RouteInfo {
    path: string;

    exact?: boolean;

    name: string;

    children: JSX.Element | null;

    noCache?: boolean;
}

function App(): JSX.Element | null {
    const location = useLocation();

    const [logger] = useState(() => new AdbEventLogger());
    const [device, setDevice] = useState<Adb | undefined>();

    const [leftPanelVisible, setLeftPanelVisible] = useState(() => innerWidth > 650);
    const toggleLeftPanel = useCallback(() => {
        setLeftPanelVisible(value => !value);
    }, []);


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
                <DeviceInfo device={device} />
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
        <LoggerContextProvider>
            <Stack verticalFill>
                <Stack className={classNames['title-container']} horizontal verticalAlign="center">
                    <IconButton
                        checked={leftPanelVisible}
                        title="Toggle Menu"
                        iconProps={{ iconName: 'GlobalNavButton' }}
                        onClick={toggleLeftPanel}
                    />

                    <StackItem grow>
                        <div className={classNames.title}>WebADB Demo</div>
                    </StackItem>

                    <ToggleLogger />
                </Stack>

                <Stack grow horizontal verticalFill disableShrink styles={{ root: { minHeight: 0, overflow: 'hidden', lineHeight: '1.5' } }}>
                    <StackItem className={mergeStyles(classNames['left-column'], !leftPanelVisible && { display: 'none' })}>
                        <Connect
                            device={device}
                            logger={logger.logger}
                            onDeviceChange={setDevice}
                        />

                        <Nav
                            styles={{ root: {} }}
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

                    <StackItem grow styles={{ root: { width: 0 } }}>
                        <CacheSwitch>
                            {routes.map<ReactElement>(route => (
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

                    <Logger className={classNames['right-column']} logger={logger} />
                </Stack>
            </Stack>
        </LoggerContextProvider>
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
