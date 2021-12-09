import { IComponentAsProps, IconButton, INavButtonProps, initializeIcons, mergeStyles, mergeStyleSets, Nav, Stack, StackItem } from "@fluentui/react";
import type { AppProps } from 'next/app';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useState } from "react";
import { Connect, ErrorDialogProvider, LogView, ToggleLogView } from "../components";
import '../styles/globals.css';

initializeIcons();

const ROUTES = [
    {
        url: '/',
        name: 'README',
    },
    {
        url: '/device-info',
        name: 'Device Info',
    },
    {
        url: '/file-manager',
        name: 'File Manager',
    },
    {
        url: '/framebuffer',
        name: 'Screen Capture',
    },
    {
        url: '/shell',
        name: 'Interactive Shell',
    },
    {
        url: '/scrcpy',
        name: 'Scrcpy',
    },
    {
        url: '/tcpip',
        name: 'ADB over WiFi',
    },
];

function NavLink({ link, defaultRender: DefaultRender, ...props }: IComponentAsProps<INavButtonProps>) {
    if (!link) {
        return null;
    }

    return (
        <Link href={link.url} passHref>
            <DefaultRender {...props} />
        </Link>
    );
}

function MyApp({ Component, pageProps }: AppProps) {
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

    const [leftPanelVisible, setLeftPanelVisible] = useState(false);
    const toggleLeftPanel = useCallback(() => {
        setLeftPanelVisible(value => !value);
    }, []);
    useEffect(() => {
        setLeftPanelVisible(innerWidth > 650);
    }, []);

    const router = useRouter();

    return (
        <ErrorDialogProvider>
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

                    <ToggleLogView />
                </Stack>

                <Stack grow horizontal verticalFill disableShrink styles={{ root: { minHeight: 0, overflow: 'hidden', lineHeight: '1.5' } }}>
                    <StackItem className={mergeStyles(classNames['left-column'], !leftPanelVisible && { display: 'none' })}>
                        <Connect />

                        <Nav
                            groups={[{
                                links: ROUTES.map(route => ({
                                    ...route,
                                    key: route.url,
                                })),
                            }]}
                            linkAs={NavLink}
                            selectedKey={router.pathname}
                        />
                    </StackItem>

                    <StackItem grow styles={{ root: { width: 0 } }}>
                        <Component {...pageProps} />
                    </StackItem>

                    <LogView className={classNames['right-column']} />
                </Stack>
            </Stack>
        </ErrorDialogProvider >
    );
}

export default MyApp;
