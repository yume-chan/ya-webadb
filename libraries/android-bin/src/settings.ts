import { AdbCommandBase } from "@yume-chan/adb";

export type SettingsNamespace = 'system' | 'secure' | 'global';

// frameworks/base/packages/SettingsProvider/src/com/android/providers/settings/SettingsService.java
export class Settings extends AdbCommandBase {
    // TODO: `--user <user>` argument
    // TODO: `reset` command

    public base(command: string, namespace: SettingsNamespace, ...args: string[]) {
        return this.adb.childProcess.spawnAndWaitLegacy(['settings', command, namespace, ...args]);
    }

    public get(namespace: SettingsNamespace, key: string) {
        return this.base('get', namespace, key);
    }

    public delete(namespace: SettingsNamespace, key: string) {
        return this.base('delete', namespace, key);
    }

    public put(namespace: SettingsNamespace, key: string, value: string, tag?: string, makeDefault?: boolean) {
        return this.base(
            'put',
            namespace,
            key,
            value,
            ...(tag ? [tag] : []),
            ...(makeDefault ? ['default'] : []),
        );
    }
}
