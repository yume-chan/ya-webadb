import { AdbScrcpyClient } from "@yume-chan/adb-scrcpy";
import { AoaHidDevice, HidKeyCode, HidKeyboard } from "@yume-chan/aoa";
import { Disposable } from "@yume-chan/event";
import {
    AndroidKeyCode,
    AndroidKeyEventAction,
    AndroidKeyEventMeta,
} from "@yume-chan/scrcpy";

export interface KeyboardInjector extends Disposable {
    down(key: string): Promise<void>;
    up(key: string): Promise<void>;
    reset(): Promise<void>;
}

export class ScrcpyKeyboardInjector implements KeyboardInjector {
    private readonly client: AdbScrcpyClient;

    private _controlLeft = false;
    private _controlRight = false;
    private _shiftLeft = false;
    private _shiftRight = false;
    private _altLeft = false;
    private _altRight = false;
    private _metaLeft = false;
    private _metaRight = false;

    private _capsLock = false;
    private _numLock = true;

    private _keys: Set<AndroidKeyCode> = new Set();

    public constructor(client: AdbScrcpyClient) {
        this.client = client;
    }

    private setModifier(keyCode: AndroidKeyCode, value: boolean) {
        switch (keyCode) {
            case AndroidKeyCode.ControlLeft:
                this._controlLeft = value;
                break;
            case AndroidKeyCode.ControlRight:
                this._controlRight = value;
                break;
            case AndroidKeyCode.ShiftLeft:
                this._shiftLeft = value;
                break;
            case AndroidKeyCode.ShiftRight:
                this._shiftRight = value;
                break;
            case AndroidKeyCode.AltLeft:
                this._altLeft = value;
                break;
            case AndroidKeyCode.AltRight:
                this._altRight = value;
                break;
            case AndroidKeyCode.MetaLeft:
                this._metaLeft = value;
                break;
            case AndroidKeyCode.MetaRight:
                this._metaRight = value;
                break;
            case AndroidKeyCode.CapsLock:
                if (value) {
                    this._capsLock = !this._capsLock;
                }
                break;
            case AndroidKeyCode.NumLock:
                if (value) {
                    this._numLock = !this._numLock;
                }
                break;
        }
    }

    private getMetaState(): AndroidKeyEventMeta {
        let metaState = 0;
        if (this._altLeft) {
            metaState |=
                AndroidKeyEventMeta.AltOn | AndroidKeyEventMeta.AltLeftOn;
        }
        if (this._altRight) {
            metaState |=
                AndroidKeyEventMeta.AltOn | AndroidKeyEventMeta.AltRightOn;
        }
        if (this._shiftLeft) {
            metaState |=
                AndroidKeyEventMeta.ShiftOn | AndroidKeyEventMeta.ShiftLeftOn;
        }
        if (this._shiftRight) {
            metaState |=
                AndroidKeyEventMeta.ShiftOn | AndroidKeyEventMeta.ShiftRightOn;
        }
        if (this._controlLeft) {
            metaState |=
                AndroidKeyEventMeta.CtrlOn | AndroidKeyEventMeta.CtrlLeftOn;
        }
        if (this._controlRight) {
            metaState |=
                AndroidKeyEventMeta.CtrlOn | AndroidKeyEventMeta.CtrlRightOn;
        }
        if (this._metaLeft) {
            metaState |=
                AndroidKeyEventMeta.MetaOn | AndroidKeyEventMeta.MetaLeftOn;
        }
        if (this._metaRight) {
            metaState |=
                AndroidKeyEventMeta.MetaOn | AndroidKeyEventMeta.MetaRightOn;
        }
        if (this._capsLock) {
            metaState |= AndroidKeyEventMeta.CapsLockOn;
        }
        if (this._numLock) {
            metaState |= AndroidKeyEventMeta.NumLockOn;
        }
        return metaState;
    }

    public async down(key: string): Promise<void> {
        const keyCode = AndroidKeyCode[key as keyof typeof AndroidKeyCode];
        if (!keyCode) {
            return;
        }

        this.setModifier(keyCode, true);
        this._keys.add(keyCode);
        await this.client.controlMessageWriter?.injectKeyCode({
            action: AndroidKeyEventAction.Down,
            keyCode,
            metaState: this.getMetaState(),
            repeat: 0,
        });
    }

    public async up(key: string): Promise<void> {
        const keyCode = AndroidKeyCode[key as keyof typeof AndroidKeyCode];
        if (!keyCode) {
            return;
        }

        this.setModifier(keyCode, false);
        this._keys.delete(keyCode);
        await this.client.controlMessageWriter?.injectKeyCode({
            action: AndroidKeyEventAction.Up,
            keyCode,
            metaState: this.getMetaState(),
            repeat: 0,
        });
    }

    public async reset(): Promise<void> {
        this._controlLeft = false;
        this._controlRight = false;
        this._shiftLeft = false;
        this._shiftRight = false;
        this._altLeft = false;
        this._altRight = false;
        this._metaLeft = false;
        this._metaRight = false;
        for (const key of this._keys) {
            this.up(AndroidKeyCode[key]);
        }
        this._keys.clear();
    }

    public dispose(): void {
        // do nothing
    }
}

export class AoaKeyboardInjector implements KeyboardInjector {
    public static async register(
        device: USBDevice
    ): Promise<AoaKeyboardInjector> {
        const keyboard = await AoaHidDevice.register(
            device,
            0,
            HidKeyboard.DESCRIPTOR
        );
        return new AoaKeyboardInjector(keyboard);
    }

    private readonly aoaKeyboard: AoaHidDevice;
    private readonly hidKeyboard = new HidKeyboard();

    public constructor(aoaKeyboard: AoaHidDevice) {
        this.aoaKeyboard = aoaKeyboard;
    }

    public async down(key: string): Promise<void> {
        const keyCode = HidKeyCode[key as keyof typeof HidKeyCode];
        if (!keyCode) {
            return;
        }

        this.hidKeyboard.down(keyCode);
        await this.aoaKeyboard.sendInputReport(
            this.hidKeyboard.serializeInputReport()
        );
    }

    public async up(key: string): Promise<void> {
        const keyCode = HidKeyCode[key as keyof typeof HidKeyCode];
        if (!keyCode) {
            return;
        }

        this.hidKeyboard.up(keyCode);
        await this.aoaKeyboard.sendInputReport(
            this.hidKeyboard.serializeInputReport()
        );
    }

    public async reset(): Promise<void> {
        this.hidKeyboard.reset();
        await this.aoaKeyboard.sendInputReport(
            this.hidKeyboard.serializeInputReport()
        );
    }

    public async dispose(): Promise<void> {
        await this.aoaKeyboard.unregister();
    }
}
