import { Dropdown, IDropdownOption, Position, Separator, SpinButton, Toggle } from '@fluentui/react';
import { Adb, AdbDemoModeMobileDataType, AdbDemoModeWifiSignalStrength } from '@yume-chan/adb';
import React, { useCallback, useEffect, useState } from 'react';
import { withDisplayName } from '../utils';

export interface DemoModeProps {
    device?: Adb;

    style?: React.CSSProperties;
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
    Object.values(AdbDemoModeMobileDataType)
        .map((key) => ({
            key,
            text: {
                [AdbDemoModeMobileDataType.Hidden]: 'Hidden',
                [AdbDemoModeMobileDataType.OneX]: '1x',
                [AdbDemoModeMobileDataType.ThirdGen]: '3G',
                [AdbDemoModeMobileDataType.FourthGen]: '4G',
                [AdbDemoModeMobileDataType.EDGE]: 'E',
                [AdbDemoModeMobileDataType.GPRS]: 'G',
                [AdbDemoModeMobileDataType.HSPA]: 'H',
                [AdbDemoModeMobileDataType.LTE]: 'LTE',
                [AdbDemoModeMobileDataType.Roaming]: 'Roam',
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
                setAllowed(await device.demoMode.getAllowed());
            }
        })();
    }, [device]);

    const handleAllowedChange = useCallback(async (e, value?: boolean) => {
        if (value === undefined) {
            return;
        }
        await device!.demoMode.setAllowed(value);
        setAllowed(value);
    }, [device]);

    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        setEnabled(false);
    }, [device]);

    const handleEnabledChange = useCallback(async (e, value?: boolean) => {
        if (value === undefined) {
            return;
        }
        if (value === false) {
            await device!.demoMode.exit();
        }
        setEnabled(value);
    }, [device]);

    const [batteryLevel, setBatteryLevel] = useDemoModeSetting(
        100,
        enabled,
        setEnabled,
        async value => await device!.demoMode.setBatteryLevel(value)
    );

    const handleBatteryLevelChange = useCallback((value: string) => {
        let number = Number.parseInt(value.replace(/[^0-9]/g, ''), 10);
        if (number < 0) {
            number = 0;
        }
        else if (number > 100) {
            number = 100;
        }
        setBatteryLevel(number);
        return number.toString();
    }, [setBatteryLevel]);

    const handleBatteryLevelIncrease = useCallback((value: string) => {
        let number = Number.parseInt(value.replace(/[^0-9]/g, ''), 10);
        number += 1;
        if (number < 0) {
            number = 0;
        }
        else if (number > 100) {
            number = 100;
        }
        setBatteryLevel(number);
        return number.toString();
    }, [setBatteryLevel]);

    const handleBatteryLevelDecrease = useCallback((value: string) => {
        let number = Number.parseInt(value.replace(/[^0-9]/g, ''), 10);
        number -= 1;
        if (number < 0) {
            number = 0;
        }
        else if (number > 100) {
            number = 100;
        }
        setBatteryLevel(number);
        return number.toString();
    }, [setBatteryLevel]);

    const [batteryCharing, setBatteryCharging] = useDemoModeSetting(
        false,
        enabled,
        setEnabled,
        async value => await device!.demoMode.setBatteryCharging(value)
    );

    const handleBatteryChargingChanged = useCallback(async (e, value?: boolean) => {
        if (value === undefined) {
            return;
        }
        setBatteryCharging(value);
    }, [setBatteryCharging]);

    // const [powerSaveMode, setPowerSaveMode] = useDemoModeSetting(
    //     false,
    //     enabled,
    //     setEnabled,
    //     async value => await device!.demoMode.setPowerSaveMode(value)
    // );

    // const handlePowerSaveModeChanged = useCallback(async (e, value?: boolean) => {
    //     if (value === undefined) {
    //         return;
    //     }
    //     setPowerSaveMode(value);
    // }, [setPowerSaveMode]);

    // const [airplaneMode, setAirplaneMode] = useDemoModeSetting(
    //     false,
    //     enabled,
    //     setEnabled,
    //     async value => await device!.demoMode.setAirplaneMode(value)
    // );

    // const handleAirplaneModeChanged = useCallback(async (e, value?: boolean) => {
    //     if (value === undefined) {
    //         return;
    //     }
    //     setAirplaneMode(value);
    // }, [setAirplaneMode]);

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

    const [mobileDataType, setMobileDataType] = useDemoModeSetting(
        AdbDemoModeMobileDataType.LTE,
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

            <Separator />

            <SpinButton
                label="Battery Level"
                labelPosition={Position.top}
                disabled={!device || !allowed}
                min={0}
                max={100}
                step={1}
                value={batteryLevel.toString()}
                onValidate={handleBatteryLevelChange}
                onIncrement={handleBatteryLevelIncrease}
                onDecrement={handleBatteryLevelDecrease}
            />

            <Toggle
                label="Battery Charing"
                disabled={!device || !allowed}
                checked={batteryCharing}
                onChange={handleBatteryChargingChanged}
            />

            {/* <Toggle
                label="Power Save Mode"
                disabled={!device || !allowed}
                checked={powerSaveMode}
                onChange={handlePowerSaveModeChanged}
            /> */}

            <Separator />

            {/* <Toggle
                label="Airplane Mode"
                disabled={!device || !allowed}
                checked={airplaneMode}
                onChange={handleAirplaneModeChanged}
            /> */}

            <Dropdown
                label="Wifi Signal Strength"
                options={WifiSignalStrengthOptions}
                selectedKey={wifiSignalStrength}
                onChange={handleWifiSignalStrengthChanged}
            />

            <Dropdown
                label="Mobile Data Type"
                options={MobileDataTypeOptions}
                selectedKey={mobileDataType}
                onChange={handleMobileDataTypeChanged}
            />

            <Dropdown
                label="Mobile Signal Strength"
                options={WifiSignalStrengthOptions}
                selectedKey={mobileSignalStrength}
                onChange={handleMobileSignalStrengthChanged}
            />

        </div>
    );
});
