import { Callout, DirectionalHint, Link, mergeStyleSets, Text } from '@fluentui/react';
import { useBoolean } from '@uifabric/react-hooks';
import React, { useCallback, useRef } from 'react';
import withDisplayName from '../with-display-name';

const classNames = mergeStyleSets({
    callout: {
        padding: '8px 12px',
    },
});

interface CopyLinkProps {
    href: string;
}

const CopyLink = withDisplayName('CopyLink', ({
    href,
}: CopyLinkProps) => {
    const calloutTarget = useRef<HTMLButtonElement | null>(null);
    const [calloutVisible, { setTrue: showCallout, setFalse: hideCallout }] = useBoolean(false);
    const copyLink = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        navigator.clipboard.writeText(href);
        calloutTarget.current = e.target as HTMLButtonElement;
        showCallout();
        setTimeout(hideCallout, 3000);
    }, [href]);

    return (
        <>
            <Link onClick={copyLink}>{href}</Link>
            <Callout
                directionalHint={DirectionalHint.topCenter}
                hidden={!calloutVisible}
                target={calloutTarget}
                onDismiss={hideCallout}
            >
                <div className={classNames.callout}>
                    Link copied. Open a new tab and paste into address bar.
                </div>
            </Callout>
        </>
    );
});

export default withDisplayName('Intro', () => {
    return (
        <>
            <Text block>
                This page is a demo of my {' '}
                <Link href="https://github.com/yume-chan/ya-webadb/" target="_blank">WebADB</Link>{' '}
                library, which can connect to your Android devices with the {' '}
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
                <CopyLink href="chrome://flags/#new-usb-backend" />
                .
            </Text>

            <Text block styles={{ root: { fontWeight: '600' } }}>
                Got "Unable to claim interface" error?
            </Text>
            <Text block>
                Only one software can connect to your device at a time.<br />
                1. Make sure ADB server is not running (run `adb kill-server` to stop it).<br />
                2. Make sure no other Android management tools are running
            </Text>
            <Text block styles={{ root: { fontWeight: '600' } }}>
                Got "Access denied" error?
            </Text>
            <Text block>
                If you have a Samsung device, it's caused by the custom driver. See {' '}
                <Link href="https://bugs.chromium.org/p/chromium/issues/detail?id=1127206">
                    https://bugs.chromium.org/p/chromium/issues/detail?id=1127206
                </Link>
            </Text>
            <Text block styles={{ root: { fontWeight: '600' } }}>
                Can I connect my device wirelessly (ADB over WiFi)?
            </Text>
            <Text block>
                No. Web browsers doesn't support TCP connections.<br />
                Or maybe, with {' '}
                <Link href="https://github.com/novnc/websockify">websockify</Link>{' '}
                running on your device and a WebSocket backend for WebADB.
            </Text>
        </>
    );
});
