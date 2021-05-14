import { Callout, DirectionalHint, Link, mergeStyleSets, Text } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { ReactNode, useCallback, useRef, MouseEvent } from 'react';
import { ExternalLink } from '../components';
import { withDisplayName } from '../utils';

const classNames = mergeStyleSets({
    callout: {
        padding: '8px 12px',
    },
});

const BoldTextStyles = { root: { fontWeight: '600' } };

interface CopyLinkProps {
    href: string;

    children?: ReactNode;
}

const CopyLink = withDisplayName('CopyLink')(({
    href,
    children,
}: CopyLinkProps) => {
    const calloutTarget = useRef<HTMLButtonElement | null>(null);
    const [calloutVisible, { setTrue: showCallout, setFalse: hideCallout }] = useBoolean(false);
    const copyLink = useCallback((e: MouseEvent<HTMLAnchorElement | HTMLElement | HTMLButtonElement>) => {
        navigator.clipboard.writeText(href);
        calloutTarget.current = e.target as HTMLButtonElement;
        showCallout();
        setTimeout(hideCallout, 3000);
    }, [href]);

    return (
        <>
            <Link onClick={copyLink}>{children || href}</Link>
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
                <span>This page is a demo for my</span>
                <ExternalLink href="https://github.com/yume-chan/ya-webadb/" spaceBefore spaceAfter>ya-webadb</ExternalLink>
                <span>project, which can connect directly to your phone in browsers, using the</span>
                <ExternalLink href="https://developer.mozilla.org/en-US/docs/Web/API/USB" spaceBefore spaceAfter>WebUSB</ExternalLink>
                <span>API</span>
            </Text>

            <Text block>
                <span>It started out as a proof of concept. </span>
                <span>And it was called "ya-webadb" (Yet Another WebADB), because there were several similar projects before this one</span>
                <span> (for example</span>
                <ExternalLink href="https://github.com/webadb/webadb.js" spaceBefore spaceAfter>webadb/webadb.js</ExternalLink>
                <span>and</span>
                <ExternalLink href="https://github.com/cybojenix/WebADB" spaceBefore>cybojenix/WebADB</ExternalLink>
                <span>).</span>
            </Text>

            <Text block styles={BoldTextStyles}>
                Security concerns:
            </Text>
            <Text block>
                <span>Undeniably, accessing USB devices directly from a web page can be pretty dangerous. </span>
                <span>Firefox developers even refused to implement the WebUSB standard because they </span>
                <ExternalLink href="https://mozilla.github.io/standards-positions/#webusb">considered it was harmful</ExternalLink>
                <span>.</span><br />

                <span>So I don't recommend the average users to try it either.</span>
            </Text>

            <Text block>
                <span>However, I believe this one is quite safe. Here are a few reasons why. </span>
                <span>You can verify it yourself (or find someone you trust to verify it for you)</span>
            </Text>

            <Text block>
                <span>1. Unlike native apps, web apps can't access your devices silently. </span>
                <span>In addition to the connection verification popup that comes with ADB, </span>
                <span>WebUSB requires the user to permit the connection through a browser-provided UI </span>
                <span>(which the web page cannot modify or skip).</span><br />

                <span>2. Because it is a proof of concept, I have used only minimal and trustworthy third-party dependencies </span>
                <span>in the development process, which just minimized</span>
                <ExternalLink href="https://en.wikipedia.org/wiki/Supply_chain_attack" spaceBefore>supply chain attacks</ExternalLink>
                <span>.</span><br />

                <span>3. All source code of this project is open sourced on</span>
                <ExternalLink href="https://github.com/yume-chan/ya-webadb/" spaceBefore>GitHub</ExternalLink>
                <span>. You can review it at any time.</span><br />

                <span>4. This site is built and deployed by </span>
                <ExternalLink href="https://github.com/yume-chan/ya-webadb/blob/master/.github/workflows/gh-pages.yml" spaceAfter>GitHub CI</ExternalLink>
                <span>to ensure that what you see is exactly the same as the source code.</span>
            </Text>

            <Text block styles={BoldTextStyles}>
                Compatibility:
            </Text>
            <Text block>
                <span>Currently, only Chromium-based browsers support the WebUSB API.</span>
                <span> Most recent versions of browsers are recommended.</span><br />

                <span>Google is developing new WebUSB implementations for</span>
                <ExternalLink href="https://bugs.chromium.org/p/chromium/issues/detail?id=637404" spaceBefore spaceAfter>Windows</ExternalLink>
                <span>and</span>
                <ExternalLink href="https://bugs.chromium.org/p/chromium/issues/detail?id=1096743" spaceBefore spaceAfter>macOS</ExternalLink>
                <span>respectively.</span>
                <span> The Windows one is already enabled by default since Chrome 87.</span><br />
                <span>It can be turned on or off manually via <CopyLink href="chrome://flags/#new-usb-backend" /></span>
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
