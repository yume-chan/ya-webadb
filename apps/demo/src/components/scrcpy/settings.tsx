import {
    Dropdown,
    IDropdownOption,
    Icon,
    IconButton,
    Position,
    SpinButton,
    Stack,
    TextField,
    Toggle,
    TooltipHost,
} from "@fluentui/react";
import { makeStyles } from "@griffel/react";
import { AdbScrcpyClient, AdbScrcpyOptionsLatest } from "@yume-chan/adb-scrcpy";
import {
    DEFAULT_SERVER_PATH,
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyLogLevel,
    ScrcpyOptionsInitLatest,
    ScrcpyOptionsLatest,
    ScrcpyVideoOrientation,
} from "@yume-chan/scrcpy";
import {
    ScrcpyVideoDecoderConstructor,
    TinyH264Decoder,
} from "@yume-chan/scrcpy-decoder-tinyh264";
import SCRCPY_SERVER_VERSION from "@yume-chan/scrcpy/bin/version";
import {
    autorun,
    computed,
    makeAutoObservable,
    observable,
    runInAction,
} from "mobx";
import { observer } from "mobx-react-lite";
import { GLOBAL_STATE } from "../../state";
import { Icons } from "../../utils";
import { STATE } from "./state";

export type Settings = ScrcpyOptionsInitLatest;

export interface ClientSettings {
    turnScreenOff?: boolean;
    decoder?: string;
    ignoreDecoderCodecArgs?: boolean;
}

export type SettingKeys = keyof (Settings & ClientSettings);

export interface SettingDefinitionBase {
    group: "settings" | "clientSettings";
    key: SettingKeys;
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
    disabled?: boolean;
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
    value: any;
    onChange: (definition: SettingDefinition, value: any) => void;
}

const useClasses = makeStyles({
    labelRight: {
        marginLeft: "4px",
    },
    item: {
        width: "100%",
        maxWidth: "300px",
    },
});

export const SettingItem = observer(function SettingItem({
    definition,
    value,
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
                    className={classes.item}
                    label={label as any}
                    placeholder={definition.placeholder}
                    value={value}
                    onChange={(e, value) => onChange(definition, value)}
                />
            );
        case "dropdown":
            return (
                <Dropdown
                    className={classes.item}
                    label={label as any}
                    options={definition.options}
                    placeholder={definition.placeholder}
                    selectedKey={value}
                    onChange={(e, option) => onChange(definition, option!.key)}
                />
            );
        case "toggle":
            return (
                <Toggle
                    label={label}
                    checked={value}
                    disabled={definition.disabled}
                    onChange={(e, checked) => onChange(definition, checked)}
                />
            );
        case "number":
            return (
                <SpinButton
                    className={classes.item}
                    label={definition.label}
                    labelPosition={Position.top}
                    min={definition.min}
                    max={definition.max}
                    step={definition.step}
                    value={value.toString()}
                    onChange={(e, value) =>
                        onChange(definition, Number.parseInt(value!, 10))
                    }
                />
            );
    }
});

export interface DecoderDefinition {
    key: string;
    name: string;
    Constructor: ScrcpyVideoDecoderConstructor;
}

export const SETTING_STATE = makeAutoObservable(
    {
        displays: [] as ScrcpyDisplay[],
        encoders: [] as ScrcpyEncoder[],
        decoders: [
            {
                key: "tinyh264",
                name: "TinyH264 (Software)",
                Constructor: TinyH264Decoder,
            },
        ] as DecoderDefinition[],

        settings: {
            maxSize: 1080,
            videoBitRate: 4_000_000,
            videoCodec: "h264",
            lockVideoOrientation: ScrcpyVideoOrientation.Unlocked,
            displayId: 0,
            crop: "",
            powerOn: true,
            audio: true,
            audioCodec: "aac",
        } as Settings,

        clientSettings: {} as ClientSettings,
    },
    {
        decoders: observable.shallow,
        settings: observable.deep,
        clientSettings: observable.deep,
    }
);

autorun(() => {
    if (GLOBAL_STATE.adb) {
        runInAction(() => {
            SETTING_STATE.encoders = [];
            SETTING_STATE.displays = [];
            SETTING_STATE.settings.displayId = undefined;
        });
    }
});

autorun(() => {
    SETTING_STATE.clientSettings.decoder = SETTING_STATE.decoders[0].key;
});

export const SETTING_DEFINITIONS = computed(() => {
    const result: SettingDefinition[] = [];

    result.push(
        {
            group: "settings",
            key: "powerOn",
            type: "toggle",
            label: "Wake device up on start",
        },
        {
            group: "clientSettings",
            key: "turnScreenOff",
            type: "toggle",
            label: "Turn screen off during mirroring",
        },
        {
            group: "settings",
            key: "stayAwake",
            type: "toggle",
            label: "Stay awake during mirroring (if plugged in)",
        },
        {
            group: "settings",
            key: "powerOffOnClose",
            type: "toggle",
            label: "Turn device off on stop",
        }
    );

    result.push({
        group: "settings",
        key: "displayId",
        type: "dropdown",
        label: "Display",
        placeholder: "Press refresh to update available displays",
        labelExtra: (
            <IconButton
                iconProps={{ iconName: Icons.ArrowClockwise }}
                disabled={!GLOBAL_STATE.adb}
                text="Refresh"
                onClick={async () => {
                    try {
                        await STATE.pushServer();

                        const displays = await AdbScrcpyClient.getDisplays(
                            GLOBAL_STATE.adb!,
                            DEFAULT_SERVER_PATH,
                            SCRCPY_SERVER_VERSION,
                            new AdbScrcpyOptionsLatest(
                                new ScrcpyOptionsLatest({
                                    logLevel: ScrcpyLogLevel.Debug,
                                })
                            )
                        );

                        runInAction(() => {
                            SETTING_STATE.displays = displays;
                            if (
                                !SETTING_STATE.settings.displayId ||
                                !SETTING_STATE.displays.some(
                                    (x) =>
                                        x.id ===
                                        SETTING_STATE.settings.displayId
                                )
                            ) {
                                SETTING_STATE.settings.displayId =
                                    SETTING_STATE.displays[0]?.id;
                            }
                        });
                    } catch (e: any) {
                        GLOBAL_STATE.showErrorDialog(e);
                    }
                }}
            />
        ),
        options: SETTING_STATE.displays.map((item) => ({
            key: item.id,
            text: `${item.id}${item.resolution ? ` (${item.resolution})` : ""}`,
        })),
    });

    result.push({
        group: "settings",
        key: "crop",
        type: "text",
        label: "Crop",
        placeholder: "W:H:X:Y",
    });

    result.push(
        {
            group: "settings",
            key: "maxSize",
            type: "number",
            label: "Max Resolution (longer side, 0 = unlimited)",
            min: 0,
            max: 2560,
            step: 50,
        },
        {
            group: "settings",
            key: "videoBitRate",
            type: "number",
            label: "Max Video Bitrate (bps)",
            min: 100,
            max: 100_000_000,
            step: 100,
        },
        {
            group: "settings",
            key: "videoCodec",
            type: "dropdown",
            label: "Video Codec",
            options: [
                {
                    key: "h264",
                    text: "H.264",
                },
                {
                    key: "h265",
                    text: "H.265",
                },
            ],
        },
        {
            group: "settings",
            key: "videoEncoder",
            type: "dropdown",
            label: "Video Encoder",
            placeholder:
                SETTING_STATE.encoders.length === 0
                    ? "Press refresh button to update encoder list"
                    : "(default)",
            labelExtra: (
                <IconButton
                    iconProps={{ iconName: Icons.ArrowClockwise }}
                    disabled={!GLOBAL_STATE.adb}
                    text="Refresh"
                    onClick={async () => {
                        try {
                            await STATE.pushServer();

                            const encoders = await AdbScrcpyClient.getEncoders(
                                GLOBAL_STATE.adb!,
                                DEFAULT_SERVER_PATH,
                                SCRCPY_SERVER_VERSION,
                                new AdbScrcpyOptionsLatest(
                                    new ScrcpyOptionsLatest({
                                        logLevel: ScrcpyLogLevel.Debug,
                                    })
                                )
                            );

                            runInAction(() => {
                                SETTING_STATE.encoders = encoders;
                            });
                        } catch (e: any) {
                            GLOBAL_STATE.showErrorDialog(e);
                        }
                    }}
                />
            ),
            options: SETTING_STATE.encoders
                .filter(
                    (item) =>
                        item.type === "video" &&
                        (!item.codec ||
                            item.codec === SETTING_STATE.settings.videoCodec!)
                )
                .map((item) => ({
                    key: item.name,
                    text: item.name,
                })),
        }
    );

    result.push({
        group: "settings",
        key: "lockVideoOrientation",
        type: "dropdown",
        label: "Lock Video Orientation",
        options: [
            {
                key: ScrcpyVideoOrientation.Unlocked,
                text: "Unlocked",
            },
            {
                key: ScrcpyVideoOrientation.Initial,
                text: "Current",
            },
            {
                key: ScrcpyVideoOrientation.Portrait,
                text: "Portrait",
            },
            {
                key: ScrcpyVideoOrientation.Landscape,
                text: "Landscape",
            },
            {
                key: ScrcpyVideoOrientation.PortraitFlipped,
                text: "Portrait (Flipped)",
            },
            {
                key: ScrcpyVideoOrientation.LandscapeFlipped,
                text: "Landscape (Flipped)",
            },
        ],
    });

    if (SETTING_STATE.decoders.length > 1) {
        result.push({
            group: "clientSettings",
            key: "decoder",
            type: "dropdown",
            label: "Video Decoder",
            options: SETTING_STATE.decoders.map((item) => ({
                key: item.key,
                text: item.name,
                data: item,
            })),
        });
    }

    result.push({
        group: "clientSettings",
        key: "ignoreDecoderCodecArgs",
        type: "toggle",
        label: `Ignore video decoder's codec options`,
        description: `Some decoders don't support all H.264 profile/levels, so they request the device to encode at their highest-supported codec. However, some super old devices may not support that codec so their encoders will fail to start. Use this option to let device choose the codec to be used.`,
    });

    result.push(
        {
            group: "settings",
            key: "audio",
            type: "toggle",
            label: "Forward Audio (Requires Android 11)",
        },
        {
            group: "settings",
            key: "audioCodec",
            type: "dropdown",
            label: "Audio Codec",
            options: [
                {
                    key: "raw",
                    text: "Raw",
                },
                {
                    key: "aac",
                    text: "AAC",
                },
                {
                    key: "opus",
                    text: "Opus",
                },
            ],
        },
        {
            group: "settings",
            key: "audioEncoder",
            type: "dropdown",
            placeholder:
                SETTING_STATE.encoders.length === 0
                    ? "Press refresh button to update encoder list"
                    : "(default)",
            label: "Audio Encoder",
            labelExtra: (
                <IconButton
                    iconProps={{ iconName: Icons.ArrowClockwise }}
                    disabled={!GLOBAL_STATE.adb}
                    text="Refresh"
                    onClick={async () => {
                        try {
                            await STATE.pushServer();

                            const encoders = await AdbScrcpyClient.getEncoders(
                                GLOBAL_STATE.adb!,
                                DEFAULT_SERVER_PATH,
                                SCRCPY_SERVER_VERSION,
                                new AdbScrcpyOptionsLatest(
                                    new ScrcpyOptionsLatest({
                                        logLevel: ScrcpyLogLevel.Debug,
                                    })
                                )
                            );

                            runInAction(() => {
                                SETTING_STATE.encoders = encoders;
                            });
                        } catch (e: any) {
                            GLOBAL_STATE.showErrorDialog(e);
                        }
                    }}
                />
            ),
            options: SETTING_STATE.encoders
                .filter(
                    (x) =>
                        x.type === "audio" &&
                        x.codec === SETTING_STATE.settings.audioCodec
                )
                .map((item) => ({
                    key: item.name,
                    text: item.name,
                })),
        }
    );

    return result;
});

autorun(() => {
    if (SETTING_STATE.encoders.length === 0) {
        SETTING_STATE.settings.videoEncoder = "";
        SETTING_STATE.settings.audioEncoder = "";
        return;
    }

    const encodersForCurrentVideoCodec = SETTING_STATE.encoders.filter(
        (item) =>
            item.type === "video" &&
            item.codec === SETTING_STATE.settings.videoCodec
    );
    if (
        SETTING_STATE.settings.videoEncoder &&
        encodersForCurrentVideoCodec.every(
            (item) => item.name !== SETTING_STATE.settings.videoEncoder
        )
    ) {
        SETTING_STATE.settings.videoEncoder = "";
    }

    const encodersForCurrentAudioCodec = SETTING_STATE.encoders.filter(
        (item) =>
            item.type === "audio" &&
            item.codec === SETTING_STATE.settings.audioCodec
    );
    if (
        SETTING_STATE.settings.audioEncoder &&
        encodersForCurrentAudioCodec.every(
            (item) => item.name !== SETTING_STATE.settings.audioEncoder
        )
    ) {
        SETTING_STATE.settings.audioEncoder = "";
    }
});
