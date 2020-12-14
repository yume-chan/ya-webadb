import { Callout, DirectionalHint, Link, mergeStyleSets, Text } from '@fluentui/react';
import { useBoolean } from '@uifabric/react-hooks';
import React, { useCallback, useRef } from 'react';
import { ExternalLink, withDisplayName } from '../utils';

const classNames = mergeStyleSets({
    callout: {
        padding: '8px 12px',
    },
});

const BoldTextStyles = { root: { fontWeight: '600' } };

interface CopyLinkProps {
    href: string;
}

const CopyLink = withDisplayName('CopyLink')(({
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

export const Intro = withDisplayName('Intro')(() => {
    return (
        <>
            <Text block>
                This page is a demo of my
                <ExternalLink href="https://github.com/yume-chan/ya-webadb/" spaceBefore spaceAfter>WebADB</ExternalLink>
                library, which can connect to your Android devices with the
                <ExternalLink href="https://developer.mozilla.org/en-US/docs/Web/API/USB" spaceBefore spaceAfter>WebUSB</ExternalLink>
                API.
            </Text>

            <Text block styles={BoldTextStyles}>
                Security concerns:
            </Text>
            <Text block>
                Yes, accessing USB devices from random website can be pretty dangerous. Firefox team even <ExternalLink href="https://mozilla.github.io/standards-positions/#webusb">considered it harmful</ExternalLink> and refused to implement it.<br />
                However, there are several reasons you can trust this one:<br />
                1. Web apps, unlike native apps, can't connect to your devices silently. Web apps must first get your permission through a browser-controlled UI, which it can't alter.<br />
                2. Web apps can be updated at any time, but native apps can also do this. So I consider this a tie.<br />
                3. Only minimal and trust-worthy dependencies are used by this website, to minimize the possibility of <ExternalLink href="https://en.wikipedia.org/wiki/Supply_chain_attack" spaceBefore>supply chain attacks</ExternalLink>.<br />
                4. The source code is available at <ExternalLink href="https://github.com/yume-chan/ya-webadb/" spaceBefore>GitHub</ExternalLink>, you can check it yourself (or you can find someone you trust to check it for you).<br />
                5. This website is built and published by <ExternalLink href="https://github.com/yume-chan/ya-webadb/blob/master/.github/workflows/gh-pages.yml">GitHub CI</ExternalLink>, so it will be exactly same with the source code.<br />
            </Text>

            <Text block styles={BoldTextStyles}>
                Compatibility:
            </Text>
            <Text block>
                Google Chrome (for Windows and Android), and Microsoft Edge (Chromium-based, for Windows) are tested. Other Chromium-based browsers should also work.<br />
                On Windows, the experimental new USB backend is required to function. You can enable it from <CopyLink href="chrome://flags/#new-usb-backend" />.<br />
                If you have a Samsung device, and got "Access denied" error, please update your browser to a newer version (Chrome 87 or later).
            </Text>

            <Text block styles={BoldTextStyles}>
                Got "Unable to claim interface" error?
            </Text>
            <Text block>
                Only one connection to your device can exist simultaneously. Please make sure<br />
                1. Native ADB client is not running (run `adb kill-server` to stop it).<br />
                2. No other Android management tools are running<br />
                3. No other WebADB tabs have already connected to your device.
            </Text>

            <Text block styles={BoldTextStyles}>
                Can I connect my device wirelessly (ADB over WiFi)?
            </Text>
            <Text block>
                No. Web browsers doesn't support TCP connections.
            </Text>
        </>
    );
});
