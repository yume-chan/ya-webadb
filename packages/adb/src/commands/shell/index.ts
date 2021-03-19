import { Adb } from '../../adb';
import { AdbFeatures } from '../../features';
import { AdbLegacyShell } from './legacy';
import { AdbShellProtocol } from './protocol';
import { AdbShell } from './types';

export * from './legacy';
export * from './protocol';
export * from './types';
export * from './utils';

export type AdbShellProtocolOption = 'auto' | 'enable' | 'disable';

export interface AdbChildProcessOptions {
    shellProtocol: 'auto' | 'enable' | 'disable',
}

const DefaultOptions: AdbChildProcessOptions = {
    shellProtocol: 'auto',
};

export class AdbChildProcess {
    public readonly adb: Adb;

    public get supportsShellProtocol(): boolean {
        return this.adb.features!.includes(AdbFeatures.ShellV2);
    }

    public constructor(adb: Adb) {
        this.adb = adb;
    }

    private async createShell(command: string, options?: Partial<AdbChildProcessOptions>): Promise<AdbShell> {
        let { shellProtocol } = { ...DefaultOptions, ...options };
        switch (shellProtocol) {
            case 'auto':
                shellProtocol = this.supportsShellProtocol ? 'enable' : 'disable';
                break;
            case 'enable':
                if (!shellProtocol) {
                    throw new Error('`shellProtocol` has been set to `enable` but the device does not support it');
                }
                break;
        }

        if (shellProtocol === 'enable') {
            return new AdbShellProtocol(await this.adb.createSocket(`shell,v2,pty:${command}`));
        }

        return new AdbLegacyShell(await this.adb.createSocket(`shell:${command}`));
    }

    public shell(options?: Partial<AdbChildProcessOptions>): Promise<AdbShell> {
        return this.createShell('', options);
    }

    public spawn(command: string | string[], options?: Partial<AdbChildProcessOptions>): Promise<AdbShell> {
        if (Array.isArray(command)) {
            command = command.join(' ');
        }
        return this.createShell(command, options);
    }

    public exec(command: string, ...args: string[]): Promise<string> {
        // `exec` only need all output, using Shell Protocol only makes it more complicate.
        return this.adb.createSocketAndReadAll(`shell:${command} ${args.join(' ')}`);
    }
}
