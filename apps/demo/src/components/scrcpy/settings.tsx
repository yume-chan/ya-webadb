import {
    Dropdown,
    IDropdownOption,
    Icon,
    Position,
    SpinButton,
    Stack,
    TextField,
    Toggle,
    TooltipHost,
} from "@fluentui/react";
import { makeStyles } from "@griffel/react";
import { ScrcpyOptionsInit1_24 } from "@yume-chan/scrcpy";
import { observer } from "mobx-react-lite";
import { Icons } from "../../utils";

type RequiredScrcpyOptions = Pick<
    ScrcpyOptionsInit1_24,
    "crop" | "maxSize" | "bitRate" | "powerOn"
>;
type OptionalScrcpyOptions = Partial<
    Pick<
        ScrcpyOptionsInit1_24,
        | "displayId"
        | "lockVideoOrientation"
        | "encoderName"
        | "tunnelForward"
        | "stayAwake"
        | "powerOffOnClose"
    >
>;

export interface Settings extends RequiredScrcpyOptions, OptionalScrcpyOptions {
    turnScreenOff?: boolean;
    decoder?: string;
    ignoreDecoderCodecArgs?: boolean;
}

export interface SettingDefinitionBase {
    key: keyof Settings;
    type: string;
    label: string;
    labelExtra?: JSX.Element;
    description?: string;
}

export interface TextSettingDefinition extends SettingDefinitionBase {
    type: "text";
    placeholder?: string;
}

export interface DropdownSettingDefinition extends SettingDefinitionBase {
    type: "dropdown";
    placeholder?: string;
    options: IDropdownOption[];
}

export interface ToggleSettingDefinition extends SettingDefinitionBase {
    type: "toggle";
}

export interface NumberSettingDefinition extends SettingDefinitionBase {
    type: "number";
    min?: number;
    max?: number;
    step?: number;
}

export type SettingDefinition =
    | TextSettingDefinition
    | DropdownSettingDefinition
    | ToggleSettingDefinition
    | NumberSettingDefinition;

interface SettingItemProps {
    definition: SettingDefinition;
    settings: any;
    onChange: (key: keyof Settings, value: any) => void;
}

const useClasses = makeStyles({
    labelRight: {
        marginLeft: "4px",
    },
});

export const SettingItem = observer(function SettingItem({
    definition,
    settings,
    onChange,
}: SettingItemProps) {
    const classes = useClasses();

    let label: JSX.Element = (
        <Stack horizontal verticalAlign="center">
            <span>{definition.label}</span>
            {!!definition.description && (
                <TooltipHost content={definition.description}>
                    <Icon
                        className={classes.labelRight}
                        iconName={Icons.Info}
                    />
                </TooltipHost>
            )}
            {definition.labelExtra}
        </Stack>
    );

    switch (definition.type) {
        case "text":
            return (
                <TextField
                    label={label as any}
                    placeholder={definition.placeholder}
                    value={settings[definition.key]}
                    onChange={(e, value) => onChange(definition.key, value)}
                />
            );
        case "dropdown":
            return (
                <Dropdown
                    label={label as any}
                    options={definition.options}
                    placeholder={definition.placeholder}
                    selectedKey={settings[definition.key]}
                    onChange={(e, option) =>
                        onChange(definition.key, option!.key)
                    }
                />
            );
        case "toggle":
            return (
                <Toggle
                    label={label}
                    checked={settings[definition.key]}
                    onChange={(e, checked) => onChange(definition.key, checked)}
                />
            );
        case "number":
            return (
                <SpinButton
                    label={definition.label}
                    labelPosition={Position.top}
                    min={definition.min}
                    max={definition.max}
                    step={definition.step}
                    value={settings[definition.key].toString()}
                    onChange={(e, value) =>
                        onChange(definition.key, Number.parseInt(value!, 10))
                    }
                />
            );
    }
});
