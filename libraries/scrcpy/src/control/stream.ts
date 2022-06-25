import { TransformStream } from '@yume-chan/stream-extra';

import type { ScrcpyBackOrScreenOnControlMessage1_18, ScrcpyInjectScrollControlMessage1_22, ScrcpyOptions } from '../options/index.js';
import { ScrcpyInjectKeyCodeControlMessage } from './inject-keycode.js';
import { ScrcpyInjectTextControlMessage } from './inject-text.js';
import { ScrcpyInjectTouchControlMessage } from './inject-touch.js';
import { ScrcpyRotateDeviceControlMessage } from './rotate-device.js';
import { ScrcpyControlMessageType } from './type.js';

export type ScrcpyControlMessage =
    | ScrcpyInjectKeyCodeControlMessage
    | ScrcpyInjectTextControlMessage
    | ScrcpyInjectTouchControlMessage
    | ScrcpyInjectScrollControlMessage1_22
    | ScrcpyBackOrScreenOnControlMessage1_18
    | ScrcpyRotateDeviceControlMessage;

export class ScrcpyControlMessageSerializeStream extends TransformStream<ScrcpyControlMessage, Uint8Array> {
    public constructor(options: ScrcpyOptions<any>) {
        // Get control message types for current version of server
        const types = options.getControlMessageTypes();

        super({
            transform(message, controller) {
                const type = types.indexOf(message.type);
                if (type === -1) {
                    throw new Error('Not supported');
                }

                switch (message.type) {
                    case ScrcpyControlMessageType.InjectKeyCode:
                        controller.enqueue(ScrcpyInjectKeyCodeControlMessage.serialize({
                            ...message,
                            type
                        }));
                        break;
                    case ScrcpyControlMessageType.InjectText:
                        controller.enqueue(ScrcpyInjectTextControlMessage.serialize({
                            ...message,
                            type,
                        }));
                        break;
                    case ScrcpyControlMessageType.InjectTouch:
                        // ADB streams are actually pretty low-bandwidth and laggy
                        // Re-sample move events to avoid flooding the connection

                        controller.enqueue(ScrcpyInjectTouchControlMessage.serialize({
                            ...message,
                            type,
                        }));
                        break;
                    case ScrcpyControlMessageType.InjectScroll:
                        controller.enqueue(options.serializeInjectScrollControlMessage({
                            ...message,
                            type,
                        }))
                        break;
                    case ScrcpyControlMessageType.BackOrScreenOn:
                        {
                            const buffer = options.serializeBackOrScreenOnControlMessage({
                                ...message,
                                type,
                            });

                            if (buffer) {
                                controller.enqueue(buffer);
                            }
                        }
                        break;
                    case ScrcpyControlMessageType.RotateDevice:
                        controller.enqueue(ScrcpyRotateDeviceControlMessage.serialize({
                            type,
                        }));
                        break;
                }
            }
        })
    }
}
