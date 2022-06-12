import { EventEmitter } from '@yume-chan/event';
import { BufferedReadableStream, ReadableWritablePair, type WritableStreamDefaultWriter } from '@yume-chan/stream-extra';

import type { ScrcpyInjectScrollControlMessage1_22, ScrcpyOptions } from '../options/index.js';
import { ClipboardMessage } from './clipboard.js';
import { AndroidKeyEventAction, ScrcpyInjectKeyCodeControlMessage } from './inject-keycode.js';
import { ScrcpyInjectTextControlMessage } from './inject-text.js';
import { AndroidMotionEventAction, ScrcpyInjectTouchControlMessage } from './inject-touch.js';
import { ScrcpySimpleControlMessage } from './simple.js';
import { ScrcpyControlMessageType } from './types.js';

export class ScrcpyControlClient {
    private options: ScrcpyOptions<any>;

    private writer: WritableStreamDefaultWriter<Uint8Array>;

    private readonly clipboardChangeEvent = new EventEmitter<string>();
    public get onClipboardChange() { return this.clipboardChangeEvent.event; }

    private lastTouchMessage = 0;

    public constructor(
        options: ScrcpyOptions<any>,
        stream: ReadableWritablePair<Uint8Array, Uint8Array>,
    ) {
        this.options = options;

        const buffered = new BufferedReadableStream(stream.readable);
        this.writer = stream.writable.getWriter();
        (async () => {
            try {
                while (true) {
                    const type = await buffered.read(1);
                    switch (type[0]) {
                        case 0:
                            const { content } = await ClipboardMessage.deserialize(buffered);
                            this.clipboardChangeEvent.fire(content!);
                            break;
                        default:
                            throw new Error('unknown control message type');
                    }
                }
            } catch {
                // TODO: Scrcpy: handle error
            }
        })();
    }

    private getControlMessageTypeValue(type: ScrcpyControlMessageType) {
        const list = this.options.getControlMessageTypes();
        const index = list.indexOf(type);
        if (index === -1) {
            throw new Error('Not supported');
        }
        return index;
    }

    public async injectKeyCode(message: Omit<ScrcpyInjectKeyCodeControlMessage, 'type'>) {

        await this.writer.write(ScrcpyInjectKeyCodeControlMessage.serialize({
            ...message,
            type: this.getControlMessageTypeValue(ScrcpyControlMessageType.InjectKeycode),
        }));
    }

    public async injectText(text: string) {
        await this.writer.write(ScrcpyInjectTextControlMessage.serialize({
            type: this.getControlMessageTypeValue(ScrcpyControlMessageType.InjectText),
            text,
        }));
    }

    public async injectTouch(message: Omit<ScrcpyInjectTouchControlMessage, 'type'>) {
        // ADB streams are actually pretty low-bandwidth and laggy
        // Re-sample move events to avoid flooding the connection

        // TODO: Scrcpy: investigate how to throttle touch events
        // because 60FPS may still be too high
        const now = Date.now();
        if (now - this.lastTouchMessage < 16 &&
            [AndroidMotionEventAction.Move, AndroidMotionEventAction.HoverMove].includes(message.action)) {
            return;
        }

        this.lastTouchMessage = now;
        await this.writer.write(ScrcpyInjectTouchControlMessage.serialize({
            ...message,
            type: this.getControlMessageTypeValue(ScrcpyControlMessageType.InjectTouch),
        }));
    }

    public async injectScroll(message: Omit<ScrcpyInjectScrollControlMessage1_22, 'type'>) {
        const buffer = this.options.serializeInjectScrollControlMessage({
            ...message,
            type: this.getControlMessageTypeValue(ScrcpyControlMessageType.InjectScroll),
        });

        await this.writer.write(buffer);
    }

    public async pressBackOrTurnOnScreen(action: AndroidKeyEventAction) {
        const buffer = this.options.serializeBackOrScreenOnControlMessage({
            type: this.getControlMessageTypeValue(ScrcpyControlMessageType.BackOrScreenOn),
            action,
        });

        if (buffer) {
            await this.writer.write(buffer);
        }
    }

    private async sendSimpleControlMessage(type: ScrcpyControlMessageType) {
        const buffer = ScrcpySimpleControlMessage.serialize({
            type: this.getControlMessageTypeValue(type),
        });
        await this.writer.write(buffer);
    }

    public async rotateDevice() {
        await this.sendSimpleControlMessage(ScrcpyControlMessageType.RotateDevice);
    }
}
