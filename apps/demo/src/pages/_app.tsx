import { IComponentAsProps, IconButton, INavButtonProps, mergeStyles, mergeStyleSets, Nav, Stack, StackItem } from "@fluentui/react";
import type { AppProps } from 'next/app';
import Head from "next/head";
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from "react";
import { Connect, ErrorDialogProvider } from "../components";
import '../styles/globals.css';
import { Icons } from "../utils";
import { register as registerIcons } from '../utils/icons';

registerIcons();

const ROUTES = [
    {
        url: '/',
        icon: Icons.Bookmark,
        name: 'README',
    },
    {
        url: '/device-info',
        icon: Icons.Phone,
        name: 'Device Info',
    },
    {
        url: '/file-manager',
        icon: Icons.Folder,
        name: 'File Manager',
    },
    {
        url: '/framebuffer',
        icon: Icons.Camera,
        name: 'Screen Capture',
    },
    {
        url: '/shell',
        icon: Icons.WindowConsole,
        name: 'Interactive Shell',
    },
    {
        url: '/scrcpy',
        icon: Icons.PhoneLaptop,
        name: 'Scrcpy',
    },
    {
        url: '/tcpip',
        icon: Icons.WifiSettings,
        name: 'ADB over WiFi',
    },
    {
        url: '/install',
        icon: Icons.Box,
        name: 'Install APK',
    },
    {
        url: '/logcat',
        icon: Icons.BookSearch,
        name: 'Logcat',
    },
    {
        url: '/power',
        icon: Icons.Power,
        name: 'Power Menu',
    },
    {
        url: '/bug-report',
        icon: Icons.Bug,
        name: 'Bug Report',
    },
    {
        url: '/packet-log',
        icon: Icons.TextGrammarError,
        name: 'Packet Log',
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

function App({ Component, pageProps }: AppProps) {
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
            width: 270,
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
            <Head>
                <link rel="manifest" href="/manifest.json" />
            </Head>

            <Stack verticalFill>
                <Stack className={classNames['title-container']} horizontal verticalAlign="center">
                    <IconButton
                        checked={leftPanelVisible}
                        title="Toggle Menu"
                        iconProps={{ iconName: Icons.Navigation }}
                        onClick={toggleLeftPanel}
                    />

                    <StackItem grow>
                        <div className={classNames.title}>Android Web Toolbox</div>
                    </StackItem>

                    <IconButton
                        iconProps={{ iconName: 'PersonFeedback' }}
                        title="Feedback"
                        as="a"
                        href="https://github.com/yume-chan/ya-webadb/issues/new"
                        target="_blank"
                    />
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
                </Stack>
            </Stack>
        </ErrorDialogProvider >
    );
}

export default App;
