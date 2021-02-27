import { Dropdown, IDropdownOption, Position, Separator, SpinButton, Toggle } from '@fluentui/react';
import { Adb, AdbDemoModeMobileDataType, AdbDemoModeMobileDataTypes, AdbDemoModeStatusBarMode, AdbDemoModeStatusBarModes, AdbDemoModeWifiSignalStrength } from '@yume-chan/adb';
import { CSSProperties, useCallback, useEffect, useState } from 'react';
import { withDisplayName } from '../utils';

export interface DemoModeProps {
    device?: Adb;

    style?: CSSProperties;
}

function useDemoModeSetting<T>(
    initialValue: T,
    enabled: boolean,
    setEnabled: (value: boolean) => void,
    onChange: (value: T) => void
): [T, (value: T) => void] {
    const [value, setValue] = useState<T>(initialValue);

    useEffect(() => {
        if (enabled) {
            onChange(value);
        }
    }, [enabled]);

    const handleChange = useCallback((value: T) => {
        setValue(value);
        if (enabled) {
            onChange(value);
        } else {
            setEnabled(true);
        }
    }, [enabled, onChange]);

    return [value, handleChange];
}

function useBooleanDemoModeSetting(
    initialValue: boolean,
    enabled: boolean,
    setEnabled: (value: boolean) => void,
    onChange: (value: boolean) => void
): [boolean, (e: any, value?: boolean) => void] {
    const [value, setValue] = useDemoModeSetting(
        initialValue,
        enabled,
        setEnabled,
        onChange
    );

    const handleChange = useCallback(async (e, value?: boolean) => {
        if (value === undefined) {
            return;
        }
        setValue(value);
    }, [setValue]);

    return [value, handleChange];
}

function useNumberDemoModeSetting(
    initialValue: number,
    enabled: boolean,
    setEnabled: (value: boolean) => void,
    onChange: (value: number) => void
): [string, (e: any, value?: string) => void] {
    const [value, setValue] = useDemoModeSetting(
        initialValue,
        enabled,
        setEnabled,
        onChange
    );

    const handleChange = useCallback(async (e, value?: string) => {
        if (value === undefined) {
            return;
        }
        setValue(+value);
    }, [setValue]);

    return [value.toString(), handleChange];
}

const WifiSignalStrengthOptions =
    Object.values(AdbDemoModeWifiSignalStrength)
        .map((key) => ({
            key,
            text: {
                [AdbDemoModeWifiSignalStrength.Hidden]: 'Hidden',
                [AdbDemoModeWifiSignalStrength.Level0]: 'Level 0',
                [AdbDemoModeWifiSignalStrength.Level1]: 'Level 1',
                [AdbDemoModeWifiSignalStrength.Level2]: 'Level 2',
                [AdbDemoModeWifiSignalStrength.Level3]: 'Level 3',
                [AdbDemoModeWifiSignalStrength.Level4]: 'Level 4',
            }[key],
        }));

const MobileDataTypeOptions =
    AdbDemoModeMobileDataTypes
        .map((key) => ({
            key,
            text: {
                '1x': '1X',
                '3g': '3G',
                '4g': '4G',
                '4g+': '4G+',
                '5g': '5G',
                '5ge': '5GE',
                '5g+': '5G+',
                'e': 'EDGE',
                'g': 'GPRS',
                'h': 'HSPA',
                'h+': 'HSPA+',
                'lte': 'LTE',
                'lte+': 'LTE+',
                'dis': 'Disabled',
                'not': 'Not default SIM',
                'null': 'Unknown',
            }[key],
        }));

const StatusBarModeOptions =
    AdbDemoModeStatusBarModes
        .map((key) => ({
            key,
            text: {
                'opaque': 'Opaque',
                'translucent': 'Translucent',
                'semi-transparent': 'Semi-transparent',
                'transparent': 'Transparent',
                'warning': 'Warning',
            }[key],
        }));

export const DemoMode = withDisplayName('DemoMode')(({
    device,
    style,
}: DemoModeProps) => {
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        (async () => {
            setAllowed(false);

            if (device) {
                const allowed = await device.demoMode.getAllowed();
                setAllowed(allowed);
                if (allowed) {
                    setEnabled(await device.demoMode.getEnabled());
                }
            }
        })();
    }, [device]);

    const handleAllowedChange = useCallback(async (e, value?: boolean) => {
        if (value === undefined) {
            return;
        }
        await device!.demoMode.setAllowed(value);
        setAllowed(value);
        setEnabled(false);
    }, [device]);

    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        setEnabled(false);
    }, [device]);

    const handleEnabledChange = useCallback(async (e, value?: boolean) => {
        if (value === undefined) {
            return;
        }
        await device!.demoMode.setEnabled(value);
        setEnabled(value);
    }, [device]);

    const [batteryLevel, setBatteryLevel] = useNumberDemoModeSetting(
        100,
        enabled,
        setEnabled,
        async value => await device!.demoMode.setBatteryLevel(value)
    );

    const [batteryCharing, setBatteryCharging] = useBooleanDemoModeSetting(
        false,
        enabled,
        setEnabled,
        async value => await device!.demoMode.setBatteryCharging(value)
    );

    const [powerSaveMode, setPowerSaveMode] = useBooleanDemoModeSetting(
        false,
        enabled,
        setEnabled,
        async value => await device!.demoMode.setPowerSaveMode(value)
    );

    const [wifiSignalStrength, setWifiSignalStrength] = useDemoModeSetting(
        AdbDemoModeWifiSignalStrength.Level4,
        enabled,
        setEnabled,
        async value => await device!.demoMode.setWifiSignalStrength(value)
    );

    const handleWifiSignalStrengthChanged = useCallback(async (e, value?: IDropdownOption) => {
        if (value === undefined) {
            return;
        }
        setWifiSignalStrength(value.key! as AdbDemoModeWifiSignalStrength);
    }, [setWifiSignalStrength]);

    const [airplaneMode, setAirplaneMode] = useBooleanDemoModeSetting(
        false,
        enabled,
        setEnabled,
        async value => await device!.demoMode.setAirplaneMode(value)
    );

    const [mobileDataType, setMobileDataType] = useDemoModeSetting<AdbDemoModeMobileDataType>(
        'lte',
        enabled,
        setEnabled,
        async value => await device!.demoMode.setMobileDataType(value)
    );

    const handleMobileDataTypeChanged = useCallback(async (e, value?: IDropdownOption) => {
        if (value === undefined) {
            return;
        }
        setMobileDataType(value.key! as AdbDemoModeMobileDataType);
    }, [setMobileDataType]);

    const [mobileSignalStrength, setMobileSignalStrength] = useDemoModeSetting(
        AdbDemoModeWifiSignalStrength.Level4,
        enabled,
        setEnabled,
        async value => await device!.demoMode.setMobileSignalStrength(value)
    );

    const handleMobileSignalStrengthChanged = useCallback(async (e, value?: IDropdownOption) => {
        if (value === undefined) {
            return;
        }
        setMobileSignalStrength(value.key! as AdbDemoModeWifiSignalStrength);
    }, [setMobileSignalStrength]);

    const [statusBarMode, setStatusBarMode] = useDemoModeSetting<AdbDemoModeStatusBarMode>(
        'transparent',
        enabled,
        setEnabled,
        async value => await device!.demoMode.setStatusBarMode(value)
    );

    const handleStatusBarModeChanged = useCallback(async (e, value?: IDropdownOption) => {
        if (value === undefined) {
            return;
        }
        setStatusBarMode(value.key! as AdbDemoModeStatusBarMode);
    }, [setStatusBarMode]);

    const [vibrateMode, setVibrateMode] = useBooleanDemoModeSetting(
        false,
        enabled,
        setEnabled,
        async value => await device!.demoMode.setVibrateModeEnabled(value)
    );

    const [bluetoothConnected, setBluetoothConnected] = useBooleanDemoModeSetting(
        false,
        enabled,
        setEnabled,
        async value => await device!.demoMode.setBluetoothConnected(value)
    );

    const [locatingIcon, setLocatingIcon] = useBooleanDemoModeSetting(
        false,
        enabled,
        setEnabled,
        async value => await device!.demoMode.setLocatingIcon(value)
    );

    const [alarmIcon, setAlarmIcon] = useBooleanDemoModeSetting(
        false,
        enabled,
        setEnabled,
        async value => await device!.demoMode.setAlarmIcon(value)
    );

    const [notificationsVisibility, setNotificationsVisibility] = useBooleanDemoModeSetting(
        true,
        enabled,
        setEnabled,
        async value => await device!.demoMode.setNotificationsVisibility(value)
    );

    const [hour, setHour] = useNumberDemoModeSetting(
        12,
        enabled,
        setEnabled,
        async value => await device!.demoMode.setTime(value, +minute)
    );

    const [minute, setMinute] = useNumberDemoModeSetting(
        34,
        enabled,
        setEnabled,
        async value => await device!.demoMode.setTime(+hour, value)
    );

    return (
        <div style={{ padding: 12, overflow: 'hidden auto', ...style }}>
            <Toggle
                label="Allowed"
                disabled={!device}
                checked={allowed}
                onChange={handleAllowedChange}
            />

            <Toggle
                label="Enabled"
                disabled={!device || !allowed}
                checked={enabled}
                onChange={handleEnabledChange}
            />

            <div><strong>Note:</strong></div>
            <div>Device may not support all options.</div>

            <Separator />

            <SpinButton
                label="Battery Level"
                labelPosition={Position.top}
                disabled={!device || !allowed}
                min={0}
                max={100}
                step={1}
                value={batteryLevel}
                onChange={setBatteryLevel}
            />

            <Toggle
                label="Battery Charing"
                disabled={!device || !allowed}
                checked={batteryCharing}
                onChange={setBatteryCharging}
            />

            <Toggle
                label="Power Save Mode"
                disabled={!device || !allowed}
                checked={powerSaveMode}
                onChange={setPowerSaveMode}
            />

            <Separator />

            <Dropdown
                label="Wifi Signal Strength"
                disabled={!device || !allowed}
                options={WifiSignalStrengthOptions}
                selectedKey={wifiSignalStrength}
                onChange={handleWifiSignalStrengthChanged}
            />

            <Toggle
                label="Airplane Mode"
                disabled={!device || !allowed}
                checked={airplaneMode}
                onChange={setAirplaneMode}
            />

            <Dropdown
                label="Mobile Data Type"
                options={MobileDataTypeOptions}
                selectedKey={mobileDataType}
                onChange={handleMobileDataTypeChanged}
            />

            <Dropdown
                label="Mobile Signal Strength"
                disabled={!device || !allowed}
                options={WifiSignalStrengthOptions}
                selectedKey={mobileSignalStrength}
                onChange={handleMobileSignalStrengthChanged}
            />

            <Separator />

            <Dropdown
                label="Status Bar Mode"
                disabled={!device || !allowed}
                options={StatusBarModeOptions}
                selectedKey={statusBarMode}
                onChange={handleStatusBarModeChanged}
            />

            <Toggle
                label="Vibrate Mode"
                disabled={!device || !allowed}
                checked={vibrateMode}
                onChange={setVibrateMode}
            />

            <Toggle
                label="Bluetooth Connected"
                disabled={!device || !allowed}
                checked={bluetoothConnected}
                onChange={setBluetoothConnected}
            />

            <Toggle
                label="Locating Icon"
                disabled={!device || !allowed}
                checked={locatingIcon}
                onChange={setLocatingIcon}
            />

            <Toggle
                label="Alarm Icon"
                disabled={!device || !allowed}
                checked={alarmIcon}
                onChange={setAlarmIcon}
            />

            <Toggle
                label="Notifications Visible"
                disabled={!device || !allowed}
                checked={notificationsVisibility}
                onChange={setNotificationsVisibility}
            />

            <SpinButton
                label="Clock Hour"
                labelPosition={Position.top}
                disabled={!device || !allowed}
                min={0}
                max={23}
                step={1}
                value={hour}
                onChange={setHour}
            />

            <SpinButton
                label="Clock Minute"
                labelPosition={Position.top}
                disabled={!device || !allowed}
                min={0}
                max={59}
                step={1}
                value={minute}
                onChange={setMinute}
            />

        </div>
    );
});
