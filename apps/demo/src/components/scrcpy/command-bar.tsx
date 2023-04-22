import {
    CommandBar,
    ContextualMenuItemType,
    ICommandBarItemProps,
} from "@fluentui/react";
import {
    AndroidKeyCode,
    AndroidKeyEventAction,
    AndroidScreenPowerMode,
} from "@yume-chan/scrcpy";
import { action, computed } from "mobx";
import { observer } from "mobx-react-lite";
import { Icons } from "../../utils";
import { CommandBarSpacerItem } from "../command-bar-spacer-item";
import { RECORD_STATE } from "./recorder";
import { STATE } from "./state";

const ITEMS = computed(() => {
    const result: ICommandBarItemProps[] = [];

    result.push({
        key: "stop",
        iconProps: { iconName: Icons.Stop },
        text: "Stop",
        onClick: STATE.stop as VoidFunction,
    });

    result.push(
        RECORD_STATE.recording
            ? {
                  key: "Record",
                  iconProps: {
                      iconName: Icons.Record,
                      style: { color: "red" },
                  },
                  // prettier-ignore
                  text: `${
                      RECORD_STATE.hours ? `${RECORD_STATE.hours}:` : ""
                  }${
                      RECORD_STATE.minutes.toString().padStart(2, "0")
                  }:${
                      RECORD_STATE.seconds.toString().padStart(2, "0")
                  }`,
                  onClick: action(() => {
                      STATE.fullScreenContainer!.focus();

                      RECORD_STATE.recorder.stop();
                      RECORD_STATE.recording = false;
                  }),
              }
            : {
                  key: "Record",
                  disabled: !STATE.running,
                  iconProps: { iconName: Icons.Record },
                  text: "Record",
                  onClick: action(() => {
                      STATE.fullScreenContainer!.focus();

                      RECORD_STATE.recorder.start();
                      RECORD_STATE.recording = true;
                  }),
              }
    );

    result.push({
        key: "fullscreen",
        disabled: !STATE.running,
        iconProps: { iconName: Icons.FullScreenMaximize },
        iconOnly: true,
        text: "Fullscreen",
        onClick: action(() => {
            STATE.fullScreenContainer!.focus();

            STATE.fullScreenContainer!.requestFullscreen();
            STATE.isFullScreen = true;
        }),
    });

    result.push(
        {
            key: "volumeUp",
            disabled: !STATE.running,
            iconProps: { iconName: Icons.Speaker2 },
            iconOnly: true,
            text: "Volume Up",
            onClick: (async () => {
                STATE.fullScreenContainer!.focus();

                // TODO: Auto repeat when holding
                await STATE.client?.controlMessageWriter!.injectKeyCode({
                    action: AndroidKeyEventAction.Down,
                    keyCode: AndroidKeyCode.VolumeUp,
                    repeat: 0,
                    metaState: 0,
                });
                await STATE.client?.controlMessageWriter!.injectKeyCode({
                    action: AndroidKeyEventAction.Up,
                    keyCode: AndroidKeyCode.VolumeUp,
                    repeat: 0,
                    metaState: 0,
                });
            }) as () => void,
        },
        {
            key: "volumeDown",
            disabled: !STATE.running,
            iconProps: { iconName: Icons.Speaker1 },
            iconOnly: true,
            text: "Volume Down",
            onClick: (async () => {
                STATE.fullScreenContainer!.focus();

                await STATE.client?.controlMessageWriter!.injectKeyCode({
                    action: AndroidKeyEventAction.Down,
                    keyCode: AndroidKeyCode.VolumeDown,
                    repeat: 0,
                    metaState: 0,
                });
                await STATE.client?.controlMessageWriter!.injectKeyCode({
                    action: AndroidKeyEventAction.Up,
                    keyCode: AndroidKeyCode.VolumeDown,
                    repeat: 0,
                    metaState: 0,
                });
            }) as () => void,
        },
        {
            key: "volumeMute",
            disabled: !STATE.running,
            iconProps: { iconName: Icons.SpeakerOff },
            iconOnly: true,
            text: "Toggle Mute",
            onClick: (async () => {
                STATE.fullScreenContainer!.focus();

                await STATE.client?.controlMessageWriter!.injectKeyCode({
                    action: AndroidKeyEventAction.Down,
                    keyCode: AndroidKeyCode.VolumeMute,
                    repeat: 0,
                    metaState: 0,
                });
                await STATE.client?.controlMessageWriter!.injectKeyCode({
                    action: AndroidKeyEventAction.Up,
                    keyCode: AndroidKeyCode.VolumeMute,
                    repeat: 0,
                    metaState: 0,
                });
            }) as () => void,
        }
    );

    result.push(
        {
            key: "rotateDevice",
            disabled: !STATE.running,
            iconProps: { iconName: Icons.Orientation },
            iconOnly: true,
            text: "Rotate Device",
            onClick: () => {
                STATE.fullScreenContainer!.focus();

                STATE.client!.controlMessageWriter!.rotateDevice();
            },
        },
        {
            key: "rotateVideoLeft",
            disabled: !STATE.running,
            iconProps: { iconName: Icons.RotateLeft },
            iconOnly: true,
            text: "Rotate Video Left",
            onClick: action(() => {
                STATE.fullScreenContainer!.focus();

                STATE.rotation -= 1;
                if (STATE.rotation < 0) {
                    STATE.rotation = 3;
                }
            }),
        },
        {
            key: "rotateVideoRight",
            disabled: !STATE.running,
            iconProps: { iconName: Icons.RotateRight },
            iconOnly: true,
            text: "Rotate Video Right",
            onClick: action(() => {
                STATE.fullScreenContainer!.focus();

                STATE.rotation = (STATE.rotation + 1) & 3;
            }),
        }
    );

    result.push(
        {
            key: "turnScreenOff",
            disabled: !STATE.running,
            iconProps: { iconName: Icons.Lightbulb },
            iconOnly: true,
            text: "Turn Screen Off",
            onClick: () => {
                STATE.fullScreenContainer!.focus();

                STATE.client!.controlMessageWriter!.setScreenPowerMode(
                    AndroidScreenPowerMode.Off
                );
            },
        },
        {
            key: "turnScreenOn",
            disabled: !STATE.running,
            iconProps: { iconName: Icons.LightbulbFilament },
            iconOnly: true,
            text: "Turn Screen On",
            onClick: () => {
                STATE.fullScreenContainer!.focus();

                STATE.client!.controlMessageWriter!.setScreenPowerMode(
                    AndroidScreenPowerMode.Normal
                );
            },
        }
    );

    if (STATE.running) {
        result.push({
            key: "fps",
            text: `FPS: ${STATE.fps}`,
            disabled: true,
        });
    }

    result.push(
        {
            // HACK: make CommandBar overflow on far items
            // https://github.com/microsoft/fluentui/issues/11842
            key: "spacer",
            onRender: () => <CommandBarSpacerItem />,
        },
        {
            // HACK: add a separator in CommandBar overflow menu
            // https://github.com/microsoft/fluentui/issues/10035
            key: "separator",
            disabled: true,
            itemType: ContextualMenuItemType.Divider,
        }
    );

    result.push(
        {
            key: "NavigationBar",
            iconProps: { iconName: Icons.PanelBottom },
            canCheck: true,
            checked: STATE.navigationBarVisible,
            text: "Navigation Bar",
            iconOnly: true,
            onClick: action(() => {
                STATE.navigationBarVisible = !STATE.navigationBarVisible;
            }),
        },
        {
            key: "Log",
            iconProps: { iconName: Icons.TextGrammarError },
            canCheck: true,
            checked: STATE.logVisible,
            text: "Log",
            iconOnly: true,
            onClick: action(() => {
                STATE.logVisible = !STATE.logVisible;
            }),
        },
        {
            key: "DemoMode",
            iconProps: { iconName: Icons.Wand },
            canCheck: true,
            checked: STATE.demoModeVisible,
            text: "Demo Mode",
            iconOnly: true,
            onClick: action(() => {
                STATE.demoModeVisible = !STATE.demoModeVisible;
            }),
        }
    );

    return result;
});

export const ScrcpyCommandBar = observer(function ScrcpyCommandBar() {
    return <CommandBar items={ITEMS.get()} />;
});
