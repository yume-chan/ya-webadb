import {
    Icon,
    MessageBar,
    Separator,
    Stack,
    TooltipHost,
} from "@fluentui/react";
import { AdbFeature } from "@yume-chan/adb";
import { observer } from "mobx-react-lite";
import type { NextPage } from "next";
import Head from "next/head";
import { ExternalLink } from "../components";
import { GLOBAL_STATE } from "../state";
import { Icons, RouteStackProps } from "../utils";

const KNOWN_FEATURES: Record<string, string> = {
    [AdbFeature.ShellV2]: `"shell" command now supports separating child process's stdout and stderr, and returning exit code`,
    // 'cmd': '',
    [AdbFeature.StatV2]:
        '"sync" command now supports "STA2" (returns more information of a file than old "STAT") and "LST2" (returns information of a directory) sub command',
    [AdbFeature.ListV2]:
        '"sync" command now supports "LST2" sub command which returns more information when listing a directory than old "LIST"',
    [AdbFeature.FixedPushMkdir]:
        "Android 9 (P) introduced a bug that pushing files to a non-existing directory would fail. This feature indicates it's fixed (Android 10)",
    // 'apex': '',
    // 'abb': '',
    // 'fixed_push_symlink_timestamp': '',
    [AdbFeature.AbbExec]:
        'Supports "abb_exec" variant that can be used to install App faster',
    // 'remount_shell': '',
    // 'track_app': '',
    // 'sendrecv_v2': '',
    sendrecv_v2_brotli:
        'Supports "brotli" compression algorithm when pushing/pulling files',
    sendrecv_v2_lz4:
        'Supports "lz4" compression algorithm when pushing/pulling files',
    sendrecv_v2_zstd:
        'Supports "zstd" compression algorithm when pushing/pulling files',
    // 'sendrecv_v2_dry_run_send': '',
};

const DeviceInfo: NextPage = () => {
    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>Device Info - Android Web Toolbox</title>
            </Head>

            <MessageBar>
                <span>
                    ADB protocol version decides the packet format between
                    client and server. By now it has 2 versions:
                </span>
                <br />

                <code>01000000</code>
                <span> used in Android versions until 8 (Oreo)</span>
                <br />

                <code>01000001</code>
                <span> used in Android versions from 9 (Pie)</span>
                <br />

                <span>For more information, you can check</span>
                <ExternalLink href="https://chensi.moe/blog/2020/09/30/webadb-part2-connection/#version">
                    my blog post
                </ExternalLink>
            </MessageBar>
            <span>
                <span>Protocol Version: </span>
                <code>
                    {GLOBAL_STATE.device?.protocolVersion
                        ?.toString(16)
                        .padStart(8, "0")}
                </code>
            </span>
            <Separator />

            <MessageBar>
                <code>ro.product.name</code>
                <span> field in Android Build Props</span>
            </MessageBar>
            <span>Product Name: {GLOBAL_STATE.device?.product}</span>
            <Separator />

            <MessageBar>
                <code>ro.product.model</code>
                <span> field in Android Build Props</span>
            </MessageBar>
            <span>Model Name: {GLOBAL_STATE.device?.model}</span>
            <Separator />

            <MessageBar>
                <code>ro.product.device</code>
                <span> field in Android Build Props</span>
            </MessageBar>
            <span>Device Name: {GLOBAL_STATE.device?.device}</span>
            <Separator />

            <MessageBar>
                <span>
                    Feature list decides how each individual commands should
                    behavior.
                </span>
                <br />

                <span>
                    For example, it may indicate the availability of a new
                    command,{" "}
                </span>
                <span>{`or a workaround for an old bug is not required because it's already been fixed.`}</span>
                <br />
            </MessageBar>
            <span>
                <span>Features: </span>
                {GLOBAL_STATE.device?.features?.map((feature, index) => (
                    <span key={feature}>
                        {index !== 0 && <span>, </span>}
                        <span>{feature}</span>
                        {KNOWN_FEATURES[feature] && (
                            <TooltipHost
                                content={<span>{KNOWN_FEATURES[feature]}</span>}
                            >
                                <Icon
                                    style={{ marginLeft: 4 }}
                                    iconName={Icons.Info}
                                />
                            </TooltipHost>
                        )}
                    </span>
                ))}
            </span>
        </Stack>
    );
};

export default observer(DeviceInfo);
