import { EventEmitter } from '@yume-chan/event';
import { AbortController, BufferedStream, InspectStream, ReadableStream, ReadableWritablePair, TransformStream, type WritableStreamDefaultWriter } from '@yume-chan/stream-extra';
import Struct from '@yume-chan/struct';

import { AndroidMotionEventAction, ScrcpyControlMessageType, ScrcpyInjectKeyCodeControlMessage, ScrcpyInjectTextControlMessage, ScrcpyInjectTouchControlMessage, ScrcpySimpleControlMessage, type AndroidKeyEventAction } from './message.js';
import type { ScrcpyInjectScrollControlMessage1_22, ScrcpyOptions, VideoStreamPacket } from './options/index.js';

const ClipboardMessage =
    new Struct()
        .uint32('length')
        .string('content', { lengthField: 'length' });

export class ScrcpyClient {
    private options: ScrcpyOptions<any>;

    private _abortController = new AbortController();

    private _stdout: ReadableStream<string>;
    public get stdout() { return this._stdout; }

    private _exit: Promise<void>;
    public get exit() { return this._exit; }

    private _screenWidth: number | undefined;
    public get screenWidth() { return this._screenWidth; }

    private _screenHeight: number | undefined;
    public get screenHeight() { return this._screenHeight; }

    private _videoStream: ReadableStream<VideoStreamPacket>;
    public get videoStream() { return this._videoStream; }

    private _controlStreamWriter: WritableStreamDefaultWriter<Uint8Array> | undefined;

    private readonly clipboardChangeEvent = new EventEmitter<string>();
    public get onClipboardChange() { return this.clipboardChangeEvent.event; }

    private lastTouchMessage = 0;

    public constructor(
        options: ScrcpyOptions<any>,
        stdout: ReadableStream<string>,
        videoStream: ReadableStream<Uint8Array>,
        controlStream: ReadableWritablePair<Uint8Array, Uint8Array> | undefined,
    ) {
        this.options = options;

        const transform = new TransformStream<string, string>();
        this._stdout = transform.readable;
        this._exit = stdout
            .pipeTo(
                transform.writable,
                {
                    signal: this._abortController.signal,
                    preventAbort: true,
                })
            .catch(() => { })
            .then(() => { transform.writable.close() });

        this._videoStream = videoStream
            .pipeThrough(options.createVideoStreamTransformer())
            .pipeThrough(new InspectStream(packet => {
                if (packet.type === 'configuration') {
                    this._screenWidth = packet.data.croppedWidth;
                    this._screenHeight = packet.data.croppedHeight;
                }
            }));

        if (controlStream) {
            const buffered = new BufferedStream(controlStream.readable);
            this._controlStreamWriter = controlStream.writable.getWriter();
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
    }

    private checkControlStream(caller: string) {
        if (!this._controlStreamWriter) {
            throw new Error(`${caller} called with control disabled`);
        }

        return this._controlStreamWriter;
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
        const controlStream = this.checkControlStream('injectKeyCode');

        await controlStream.write(ScrcpyInjectKeyCodeControlMessage.serialize({
            ...message,
            type: this.getControlMessageTypeValue(ScrcpyControlMessageType.InjectKeycode),
        }));
    }

    public async injectText(text: string) {
        const controlStream = this.checkControlStream('injectText');

        await controlStream.write(ScrcpyInjectTextControlMessage.serialize({
            type: this.getControlMessageTypeValue(ScrcpyControlMessageType.InjectText),
            text,
        }));
    }

    public async injectTouch(message: Omit<ScrcpyInjectTouchControlMessage, 'type' | 'screenWidth' | 'screenHeight'>) {
        const controlStream = this.checkControlStream('injectTouch');

        if (!this.screenWidth || !this.screenHeight) {
            return;
        }

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
        await controlStream.write(ScrcpyInjectTouchControlMessage.serialize({
            ...message,
            type: this.getControlMessageTypeValue(ScrcpyControlMessageType.InjectTouch),
            screenWidth: this.screenWidth,
            screenHeight: this.screenHeight,
        }));
    }

    public async injectScroll(message: Omit<ScrcpyInjectScrollControlMessage1_22, 'type' | 'screenWidth' | 'screenHeight'>) {
        const controlStream = this.checkControlStream('injectScroll');

        if (!this.screenWidth || !this.screenHeight) {
            return;
        }

        const buffer = this.options.serializeInjectScrollControlMessage({
            ...message,
            type: this.getControlMessageTypeValue(ScrcpyControlMessageType.InjectScroll),
            screenWidth: this.screenWidth,
            screenHeight: this.screenHeight,
        });
        await controlStream.write(buffer);
    }

    public async pressBackOrTurnOnScreen(action: AndroidKeyEventAction) {
        const controlStream = this.checkControlStream('pressBackOrTurnOnScreen');

        const buffer = this.options.serializeBackOrScreenOnControlMessage({
            type: this.getControlMessageTypeValue(ScrcpyControlMessageType.BackOrScreenOn),
            action,
        });
        if (buffer) {
            await controlStream.write(buffer);
        }
    }

    private async sendSimpleControlMessage(type: ScrcpyControlMessageType, name: string) {
        const controlStream = this.checkControlStream(name);
        const buffer = ScrcpySimpleControlMessage.serialize({
            type: this.getControlMessageTypeValue(type),
        });
        await controlStream.write(buffer);
    }

    public async rotateDevice() {
        await this.sendSimpleControlMessage(ScrcpyControlMessageType.RotateDevice, 'rotateDevice');
    }

    public async close() {
        // No need to close streams. The device will close them when process was killed.
        this._abortController.abort();
    }
}
