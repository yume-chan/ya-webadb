const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// TextEncoder.prototype.encodeInto added in Chrome 74
// Edge for Android 44 is still using Chromium 73
if (!TextEncoder.prototype.encodeInto) {
    TextEncoder.prototype.encodeInto = function (source: string, destniation: Uint8Array) {
        const array = this.encode(source);
        destniation.set(array);
        return { read: source.length, written: array.length };
    }
}

export class AdbPacket {
    public static parse(buffer: ArrayBuffer): AdbPacket {
        const command = textDecoder.decode(buffer.slice(0, 4));

        const view = new DataView(buffer);
        const arg0 = view.getUint32(4, true);
        const arg1 = view.getUint32(8, true);
        const payloadLength = view.getUint32(12, true);

        const packet = new AdbPacket(command, arg0, arg1, undefined);
        packet._payloadLength = payloadLength;
        return packet;
    }

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
    }

    public constructor(command: string, arg0: number, arg1: number, payload?: string | ArrayBuffer) {
        if (command.length !== 4) {
            throw new TypeError('length of command must be 4');
        }

        this.command = command;
        this.arg0 = arg0;
        this.arg1 = arg1;

        if (typeof payload === "string") {
            this.payload = textEncoder.encode(payload + '\0').buffer;
        } else {
            this.payload = payload;
        }
    }

    public toBuffer(): ArrayBuffer {
        const buffer = new ArrayBuffer(24);
        const array = new Uint8Array(buffer);
        const view = new DataView(buffer);

        textEncoder.encodeInto(this.command, array);

        view.setUint32(4, this.arg0, true);
        view.setUint32(8, this.arg1, true);
        view.setUint32(12, this.payloadLength, true);
        view.setUint32(16, /* checksum */ 0, true);
        view.setUint32(20, /* magic */ view.getUint32(0, true) ^ 0xFFFFFFFF, true);

        return buffer;
    }
}
