// cspell: ignore carriernetworkchange
// cspell: ignore powersave
// cspell: ignore nosim
// cspell: ignore systemui
// cspell: ignore sysui

import { Adb, AdbCommandBase } from '@yume-chan/adb';
import { Settings } from "./settings.js";

export enum DemoModeSignalStrength {
    Hidden = 'null',
    Level0 = '0',
    Level1 = '1',
    Level2 = '2',
    Level3 = '3',
    Level4 = '4',
}

// https://cs.android.com/android/platform/superproject/+/master:frameworks/base/packages/SystemUI/src/com/android/systemui/statusbar/policy/NetworkControllerImpl.java;l=1073
export const DemoModeMobileDataTypes = ['1x', '3g', '4g', '4g+', '5g', '5ge', '5g+',
    'e', 'g', 'h', 'h+', 'lte', 'lte+', 'dis', 'not', 'null'] as const;

export type DemoModeMobileDataType = (typeof DemoModeMobileDataTypes)[number];

// https://cs.android.com/android/platform/superproject/+/master:frameworks/base/packages/SystemUI/src/com/android/systemui/statusbar/phone/StatusBar.java;l=3136
export const DemoModeStatusBarModes = ['opaque', 'translucent', 'semi-transparent', 'transparent', 'warning'] as const;

export type DemoModeStatusBarMode = (typeof DemoModeStatusBarModes)[number];

export class DemoMode extends AdbCommandBase {
    private settings: Settings;

    constructor(adb: Adb) {
        super(adb);
        this.settings = new Settings(adb);
    }

    public static readonly AllowedSettingKey = 'sysui_demo_allowed';

    // Demo Mode actually doesn't have a setting indicates its enablement
    // However Developer Mode menu uses this key
    // So we can only try our best to guess if it's enabled
    public static readonly EnabledSettingKey = 'sysui_tuner_demo_on';

    public async getAllowed(): Promise<boolean> {
        const output = await this.settings.get('global', DemoMode.AllowedSettingKey);
        return output.trim() === '1';
    }

    public async setAllowed(value: boolean): Promise<void> {
        if (value) {
            await this.settings.put('global', DemoMode.AllowedSettingKey, '1');
        } else {
            await this.setEnabled(false);
            await this.settings.delete('global', DemoMode.AllowedSettingKey);
        }
    }

    public async getEnabled(): Promise<boolean> {
        const result = await this.settings.get('global', DemoMode.EnabledSettingKey);
        return result.trim() === '1';
    }

    public async setEnabled(value: boolean): Promise<void> {
        if (value) {
            await this.settings.put('global', DemoMode.EnabledSettingKey, '1');
        } else {
            await this.settings.delete('global', DemoMode.EnabledSettingKey);
            await this.broadcast('exit');
        }
    }

    public async broadcast(command: string, extra?: Record<string, string>): Promise<void> {
        await this.adb.subprocess.spawnAndWaitLegacy([
            'am',
            'broadcast',
            '-a',
            'com.android.systemui.demo',
            '-e',
            'command',
            command,
            ...(extra ? Object.entries(extra).flatMap(([key, value]) => ['-e', key, value]) : []),
        ]);
    }

    public async setBatteryLevel(level: number): Promise<void> {
        await this.broadcast('battery', { level: level.toString() });
    }

    public async setBatteryCharging(value: boolean): Promise<void> {
        await this.broadcast('battery', { plugged: value.toString() });
    }

    public async setPowerSaveMode(value: boolean): Promise<void> {
        await this.broadcast('battery', { powersave: value.toString() });
    }

    public async setAirplaneMode(show: boolean): Promise<void> {
        await this.broadcast('network', { airplane: show ? 'show' : 'hide' });
    }

    public async setWifiSignalStrength(value: DemoModeSignalStrength): Promise<void> {
        await this.broadcast('network', { wifi: 'show', level: value });
    }

    public async setMobileDataType(value: DemoModeMobileDataType): Promise<void> {
        for (let i = 0; i < 2; i += 1) {
            await this.broadcast('network', {
                mobile: 'show',
                sims: '1',
                nosim: 'hide',
                slot: '0',
                datatype: value,
                fully: 'true',
                roam: 'false',
                level: '4',
                inflate: 'false',
                activity: 'in',
                carriernetworkchange: 'hide',
            });
        }
    }

    public async setMobileSignalStrength(value: DemoModeSignalStrength): Promise<void> {
        await this.broadcast('network', { mobile: 'show', level: value });
    }

    public async setNoSimCardIcon(show: boolean): Promise<void> {
        await this.broadcast('network', { nosim: show ? 'show' : 'hide' });
    }

    public async setStatusBarMode(mode: DemoModeStatusBarMode): Promise<void> {
        await this.broadcast('bars', { mode });
    }

    public async setVibrateModeEnabled(value: boolean): Promise<void> {
        // https://cs.android.com/android/platform/superproject/+/master:frameworks/base/packages/SystemUI/src/com/android/systemui/statusbar/phone/DemoStatusIcons.java;l=103
        await this.broadcast('status', { volume: value ? 'vibrate' : 'hide' });
    }

    public async setBluetoothConnected(value: boolean): Promise<void> {
        // https://cs.android.com/android/platform/superproject/+/master:frameworks/base/packages/SystemUI/src/com/android/systemui/statusbar/phone/DemoStatusIcons.java;l=114
        await this.broadcast('status', { bluetooth: value ? 'connected' : 'hide' });
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
        // https://cs.android.com/android/platform/superproject/+/master:frameworks/base/packages/SystemUI/src/com/android/systemui/statusbar/phone/StatusBar.java;l=3131
        await this.broadcast('notifications', { visible: show.toString() });
    }

    public async setTime(hour: number, minute: number): Promise<void> {
        await this.broadcast('clock', {
            // cspell: disable-next-line
            hhmm:
                hour.toString().padStart(2, '0') +
                minute.toString().padStart(2, '0'),
        });
    }
}
