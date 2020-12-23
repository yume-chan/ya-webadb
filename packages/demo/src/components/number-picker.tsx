import { Position, SpinButton } from '@fluentui/react';
import React, { useCallback } from 'react';
import { withDisplayName } from '../utils';

export interface NumberPickerProps {
    label: string;

    labelPosition?: Position;

    disabled?: boolean;

    value: number;

    min: number;

    max: number;

    step: number;

    onChange: (value: number) => void;
}

export const NumberPicker = withDisplayName('NumberPicker')(({
    label,
    labelPosition,
    disabled,
    value,
    min,
    max,
    step,
    onChange,
}: NumberPickerProps) => {
    const handleChange = useCallback((value: string) => {
        let number = Number.parseInt(value.replace(/[^0-9]/g, ''), 10);
        if (number < min) {
            number = min;
        } else if (number > max) {
            number = max;
        }
        onChange(number);
        return number.toString();
    }, [min, max, onChange]);

    const handleIncrease = useCallback((value: string) => {
        let number = Number.parseInt(value.replace(/[^0-9]/g, ''), 10);
        number += step;
        if (number < min) {
            number = min;
        } else if (number > max) {
            number = max;
        }
        onChange(number);
        return number.toString();
    }, [step, min, max, onChange]);

    const handleDecrease = useCallback((value: string) => {
        let number = Number.parseInt(value.replace(/[^0-9]/g, ''), 10);
        number -= step;
        if (number < min) {
            number = min;
        }
        else if (number > max) {
            number = max;
        }
        onChange(number);
        return number.toString();
    }, [step, min, max, onChange]);

    return (
        <SpinButton
            label={label}
            labelPosition={labelPosition}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            value={value.toString()}
            onValidate={handleChange}
            onIncrement={handleIncrease}
            onDecrement={handleDecrease}
        />
    );
});
