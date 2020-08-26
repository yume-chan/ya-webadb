import { AdbBackend } from './backend';

namespace Assert {
    export function command(command: string): void {
        const length = command.length;
        if (length !== 4) {
            throw new Error(`AdbPacket: command.length mismatch. Expected 4, but got ${length}`);
        }
    }

    export function magic(view: DataView): void {
        const expected = view.getUint32(0) ^ 0xFFFFFFFF;
        const actual = view.getInt32(20);
        if (expected !== actual) {
            throw new Error(`AdbPacket: magic number mismatch. Expected ${expected}, but got ${actual}`);
        }
    }
}

export enum AdbCommand {
    Connect = 'CNXN',
    Auth = 'AUTH',
    OK = 'OKAY',
    Close = 'CLSE',
    Write = 'WRTE',
    Open = 'OPEN',
}

export class AdbPacket {
    public static async parse(backend: AdbBackend): Promise<AdbPacket> {
        let buffer = await backend.read(24);
        if (buffer.byteLength !== 24) {
            // Maybe it's a payload from last connection.
            // Ignore and try again
            buffer = await backend.read(24);
        }
        const view = new DataView(buffer);
        Assert.magic(view);

        const command = backend.decodeUtf8(buffer.slice(0, 4));
        const arg0 = view.getUint32(4, true);
        const arg1 = view.getUint32(8, true);
        const payloadLength = view.getUint32(12, true);

        let payload: ArrayBuffer | undefined;
        if (payloadLength !== 0) {
            payload = await backend.read(payloadLength);
        }

        return new AdbPacket(backend, command, arg0, arg1, payload);
    }

    public static send(
        backend: AdbBackend,
        command: AdbCommand,
        arg0: number,
        arg1: number,
        payload?: string | ArrayBuffer
    ): Promise<void> {
        const packet = new AdbPacket(backend, command, arg0, arg1, payload);
        return packet.send();
    }

    private backend: AdbBackend;

    public command: string;

    public arg0: number;

    public arg1: number;

    private _payloadLength!: number;
    public get payloadLength(): number { return this._payloadLength; }

    private _payload: ArrayBuffer | undefined;
    public get payload(): ArrayBuffer | undefined { return this._payload; }
    public set payload(value: ArrayBuffer | undefined) {
        if (value !== undefined) {
            this._payloadLength = value.byteLength;
            this._payload = value;
        } else {
            this._payloadLength = 0;
            this._payload = undefined;
        }

        this._payloadString = undefined;
    }

    private _payloadString: string | undefined;
    public get payloadString(): string | undefined {
        if (!this._payload) {
            return undefined;
        }

        if (!this._payloadString) {
            this._payloadString = this.backend.decodeUtf8(this._payload);
        }
        return this._payloadString;
    }
    public set payloadString(value: string | undefined) {
        if (value !== undefined) {
            this.payload = this.backend.encodeUtf8(value);
            this._payloadString = value;
        } else {
            this.payload = undefined;
        }
    }

    public constructor(
        backend: AdbBackend,
        command: string,
        arg0: number,
        arg1: number,
        payload?: string | ArrayBuffer
    ) {
        this.backend = backend;

        Assert.command(command);
        this.command = command;

        this.arg0 = arg0;
        this.arg1 = arg1;

        if (typeof payload === "string") {
            this.payloadString = payload;
        } else {
            this.payload = payload;
        }
    }

    public async send(): Promise<void> {
        const buffer = new ArrayBuffer(24);
        const array = new Uint8Array(buffer);
        array.set(new Uint8Array(this.backend.encodeUtf8(this.command)));

        const view = new DataView(buffer);
        view.setUint32(4, this.arg0, true);
        view.setUint32(8, this.arg1, true);
        view.setUint32(12, this.payloadLength, true);
        view.setUint32(16, /* checksum */ 0, true);
        view.setUint32(20, /* magic */ view.getUint32(0, true) ^ 0xFFFFFFFF, true);

        await this.backend.write(buffer);

        if (this.payload) {
            await this.backend.write(this.payload);
        }
    }
}
