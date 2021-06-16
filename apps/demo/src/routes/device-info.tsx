import { Icon, MessageBar, Separator, TooltipHost } from '@fluentui/react';
import { AdbFeatures } from '@yume-chan/adb';
import { ExternalLink } from '../components';
import { withDisplayName } from '../utils';
import { useAdbDevice } from './type';

const knownFeatures: Record<string, string> = {
    'shell_v2': `"shell" command now supports separating child process's stdout and stderr, and returning exit code`,
    // 'cmd': '',
    [AdbFeatures.StatV2]: '"sync" command now supports "STA2" (returns more information of a file than old "STAT") and "LST2" (returns information of a directory) sub command',
    'ls_v2': '"sync" command now supports "LST2" sub command which returns more information when listing a directory than old "LIST"',
    // 'fixed_push_mkdir': '',
    // 'apex': '',
    // 'abb': '',
    // 'fixed_push_symlink_timestamp': '',
    'abb_exec': 'Support "exec" command which can stream stdin into child process',
    // 'remount_shell': '',
    // 'track_app': '',
    // 'sendrecv_v2': '',
    // 'sendrecv_v2_brotli': '',
    // 'sendrecv_v2_lz4': '',
    // 'sendrecv_v2_zstd': '',
    // 'sendrecv_v2_dry_run_send': '',
};

export const DeviceInfo = withDisplayName('DeviceInfo')((): JSX.Element | null => {
    const device = useAdbDevice();

    return (
        <>
            <MessageBar>
                <span>ADB protocol version decides the packet format between client and server. By now it has 2 versions:</span>
                <br />

                <code>01000000</code>
                <span> used in Android versions until 8 (Oreo)</span>
                <br />

                <code>01000001</code>
                <span> used in Android versions from 9 (Pie)</span>
                <br />

                <span>For more information, you can check</span>
                <ExternalLink href="https://chensi.moe/blog/2020/09/30/webadb-part2-connection/#version">my blog post</ExternalLink>
            </MessageBar>
            <span>
                <span>Protocol Version: </span>
                <code>{device?.protocolVersion?.toString(16).padStart(8, '0')}</code>
            </span>
            <Separator />

            <MessageBar>
                <code>ro.product.name</code>
                <span> field in Android Build Props</span>
            </MessageBar>
            <span>Product Name: {device?.product}</span>
            <Separator />

            <MessageBar>
                <code>ro.product.model</code>
                <span> field in Android Build Props</span>
            </MessageBar>
            <span>Model Name: {device?.model}</span>
            <Separator />

            <MessageBar>
                <code>ro.product.device</code>
                <span> field in Android Build Props</span>
            </MessageBar>
            <span>Device Name: {device?.device}</span>
            <Separator />

            <MessageBar>
                <span>Feature list decides how each individual commands should behavior.</span>
                <br />

                <span>For example, it may indicate the availability of a new command, </span>
                <span>or a workaround for an old bug is not required because it's already been fixed.</span>
                <br />
            </MessageBar>
            <span>
                <span>Features: </span>
                {device?.features?.map((feature, index) => (
                    <span>
                        {index !== 0 && (<span>, </span>)}
                        <span>{feature}</span>
                        {knownFeatures[feature] && (
                            <TooltipHost
                                content={
                                    <>
                                        <span>{knownFeatures[feature]}</span>
                                    </>
                                }
                            >
                                <Icon style={{ marginLeft: 4 }} iconName="Unknown" />
                            </TooltipHost>
                        )}
                    </span>
                ))}
            </span>
        </>
    );
});
