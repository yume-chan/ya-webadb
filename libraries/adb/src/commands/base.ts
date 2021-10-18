import { AutoDisposable } from '@yume-chan/event';
import { Adb } from '../adb';

export class AdbCommandBase extends AutoDisposable {
    protected adb: Adb;

    constructor(adb: Adb) {
        super();
        this.adb = adb;
    }
}
