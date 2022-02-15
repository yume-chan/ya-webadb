import { AdbCommandBase } from "@yume-chan/adb";

export type SettingsNamespace = 'system' | 'secure' | 'global';

export type SettingsResetMode = 'untrusted_defaults' | 'untrusted_clear' | 'trusted_defaults';

// frameworks/base/packages/SettingsProvider/src/com/android/providers/settings/SettingsService.java
export class Settings extends AdbCommandBase {
    // TODO: `--user <user>` argument

    public base(command: string, namespace: SettingsNamespace, ...args: string[]) {
        return this.adb.subprocess.spawnAndWaitLegacy(['settings', command, namespace, ...args]);
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

    public reset(namespace: SettingsNamespace, mode: SettingsResetMode): Promise<string>;
    public reset(namespace: SettingsNamespace, packageName: string, tag?: string): Promise<string>;
    public reset(namespace: SettingsNamespace, modeOrPackageName: string, tag?: string): Promise<string> {
        return this.base(
            'reset',
            namespace,
            modeOrPackageName,
            ...(tag ? [tag] : []),
        );
    }

    public async list(namespace: SettingsNamespace): Promise<string[]> {
        const output = await this.base('list', namespace);
        return output.split('\n');
    }
}
