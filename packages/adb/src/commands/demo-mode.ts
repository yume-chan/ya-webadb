import { AdbCommandBase } from './base';

export enum AdbDemoModeWifiSignalStrength {
    Hidden = 'null',
    Level0 = '0',
    Level1 = '1',
    Level2 = '2',
    Level3 = '3',
    Level4 = '4',
}

export enum AdbDemoModeMobileDataType {
    Hidden = 'null',
    OneX = '1x',
    ThirdGen = '3g',
    FourthGen = '4g',
    EDGE = 'e',
    GPRS = 'g',
    HSPA = 'h',
    LTE = 'lte',
    Roaming = 'roam',
}

export class AdbDemoMode extends AdbCommandBase {
    public static readonly AllowedSettingKey = 'sysui_demo_allowed';

    public async getAllowed(): Promise<boolean> {
        const result = await this.adb.exec('settings', 'get', 'global', AdbDemoMode.AllowedSettingKey);
        return result.trim() === '1';
    }

    public async setAllowed(value: boolean): Promise<void> {
        if (value) {
            await this.adb.exec('settings', 'put', 'global', AdbDemoMode.AllowedSettingKey, '1');
        } else {
            await this.adb.exec('settings', 'delete', 'global', AdbDemoMode.AllowedSettingKey);
        }
    }

    public async broadcast(command: string, extra?: Record<string, string>): Promise<void> {
        await this.adb.exec(
            'am',
            'broadcast',
            '-a',
            'com.android.systemui.demo',
            '-e',
            'command',
            command,
            ...(extra ? Object.entries(extra).flatMap(([key, value]) => ['-e', key, value]) : []),
        );
    }

    public async exit(): Promise<void> {
        await this.broadcast('exit');
    }

    public async setBatteryLevel(level: number): Promise<void> {
        await this.broadcast('battery', { level: level.toString() });
    }

    public async setBatteryCharging(value: boolean): Promise<void> {
        await this.broadcast('battery', { plugged: value.toString() });
    }

    public async setPowerSaveMode(value: boolean): Promise<void> {
        // doesn't work
        await this.broadcast('battery', { powersave: value.toString() });
    }

    public async setAirplaneMode(show: boolean): Promise<void> {
        // doesn't work
        await this.broadcast('network', { airplane: show ? 'show' : 'hide' });
    }

    public async setWifiSignalStrength(value: AdbDemoModeWifiSignalStrength): Promise<void> {
        await this.broadcast('network', { wifi: 'show', level: value });
    }

    public async setMobileDataType(value: AdbDemoModeMobileDataType): Promise<void> {
        await this.broadcast('network', { mobile: 'show', sims: '1', 'nosim': 'hide', datatype: value });
        await this.broadcast('network', { mobile: 'show', slot: '1', fully: 'true' });
    }

    public async setMobileSignalStrength(value: AdbDemoModeWifiSignalStrength): Promise<void> {
        await this.broadcast('network', { mobile: 'show', level: value });
    }

    public async setNoSimCardIcon(show: boolean): Promise<void> {
        await this.broadcast('network', { nosim: show ? 'show' : 'hide' });
    }

    public async setStatusBarMode(mode: string): Promise<void> {
        await this.broadcast('bars', { mode });
    }

    public async setVolumeMode(mode: 'silent' | 'vibrate' | null): Promise<void> {
        await this.broadcast('status', { volume: mode ? mode : 'null' });
    }

    public async setBluetoothState(state: 'connected' | 'disconnected' | null): Promise<void> {
        await this.broadcast('status', { bluetooth: state ? state : 'null' });
    }

    public async setLocatingIcon(show: boolean): Promise<void> {
        await this.broadcast('status', { location: show ? 'show' : 'hide' });
    }

    public async setAlarmIcon(show: boolean): Promise<void> {
        await this.broadcast('status', { alarm: show ? 'show' : 'hide' });
    }

    public async setSyncingIcon(show: boolean): Promise<void> {
        await this.broadcast('status', { sync: show ? 'show' : 'hide' });
    }

    public async setMuteIcon(show: boolean): Promise<void> {
        await this.broadcast('status', { mute: show ? 'show' : 'hide' });
    }

    public async setSpeakerPhoneIcon(show: boolean): Promise<void> {
        await this.broadcast('status', { speakerphone: show ? 'show' : 'hide' });
    }

    public async setNotificationsVisibility(show: boolean): Promise<void> {
        await this.broadcast('notifications', { visible: show ? 'show' : 'hide' });
    }

    public async setTime(hour: number, minute: number): Promise<void> {
        await this.broadcast('click', { hhmm: `${hour.toString().padStart(2, '0')}${minute.toString().padStart(2, '0')}` });
    }
}
