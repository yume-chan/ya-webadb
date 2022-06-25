import type { WritableStreamDefaultWriter } from '@yume-chan/stream-extra';

import type { ScrcpyInjectScrollControlMessage1_22, ScrcpyOptions } from '../options/index.js';
import { AndroidKeyEventAction, ScrcpyInjectKeyCodeControlMessage } from './inject-keycode.js';
import { ScrcpyInjectTextControlMessage } from './inject-text.js';
import { ScrcpyInjectTouchControlMessage } from './inject-touch.js';
import { ScrcpyRotateDeviceControlMessage } from './rotate-device.js';
import { ScrcpyControlMessageType } from './type.js';

export class ScrcpyControlMessageSerializer {
    private options: ScrcpyOptions<any>;
    /** Control message type values for current version of server */
    private types: ScrcpyControlMessageType[];
    private writer: WritableStreamDefaultWriter<Uint8Array>;

    public constructor(stream: WritableStream<Uint8Array>, options: ScrcpyOptions<any>) {
        this.options = options;
        this.types = options.getControlMessageTypes();
        this.writer = stream.getWriter();
    }

    public getTypeValue(type: ScrcpyControlMessageType): number {
        const value = this.types.indexOf(type);
        if (value === -1) {
            throw new Error('Not supported');
        }
        return value;
    }

    public injectKeyCode(message: Omit<ScrcpyInjectKeyCodeControlMessage, 'type'>) {
        return this.writer.write(ScrcpyInjectKeyCodeControlMessage.serialize({
            ...message,
            type: this.getTypeValue(ScrcpyControlMessageType.InjectKeyCode),
        }));
    }

    public injectText(text: string) {
        return this.writer.write(ScrcpyInjectTextControlMessage.serialize({
            text,
            type: this.getTypeValue(ScrcpyControlMessageType.InjectText),
        }));
    }

    public injectTouch(message: Omit<ScrcpyInjectTouchControlMessage, 'type'>) {
        return this.writer.write(ScrcpyInjectTouchControlMessage.serialize({
            ...message,
            type: this.getTypeValue(ScrcpyControlMessageType.InjectTouch),
        }));
    }

    public injectScroll(message: Omit<ScrcpyInjectScrollControlMessage1_22, 'type'>) {
        return this.writer.write(this.options.serializeInjectScrollControlMessage({
            ...message,
            type: this.getTypeValue(ScrcpyControlMessageType.InjectScroll),
        }));
    }

    public async backOrScreenOn(action: AndroidKeyEventAction) {
        const buffer = this.options.serializeBackOrScreenOnControlMessage({
            action,
            type: this.getTypeValue(ScrcpyControlMessageType.BackOrScreenOn),
        });

        if (buffer) {
            return await this.writer.write(buffer);
        }
    }

    public rotateDevice() {
        return this.writer.write(ScrcpyRotateDeviceControlMessage.serialize({
            type: this.getTypeValue(ScrcpyControlMessageType.RotateDevice),
        }));
    }

    public close() {
        return this.writer.close();
    }
};
