import type {
    ReadableStream,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import { Consumable } from "@yume-chan/stream-extra";

import type { ScrcpyOptions } from "../../base/index.js";
import { ScrcpyUHidInputControlMessage } from "../../control/uhid.js";
import { ScrcpyControlMessageType } from "../../index.js";
import type { ScrcpyUHidOutputDeviceMessage } from "../../latest.js";

import type { ScrcpyDeviceMessageParser2_4 } from "./device-message-parser.js";
import { serializeUHidCreateControlMessage } from "./serialize-uhid-create.js";

export class UHidManager<T extends object> {
    #writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;
    #options: ScrcpyOptions<T>;
    #deviceMessageParser: ScrcpyDeviceMessageParser2_4<T>;
    get deviceMessageParser() {
        return this.#deviceMessageParser;
    }

    #devices = new Map<number, Uint8Array>();
    #sparseIds = new Set<number>();

    constructor(
        writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>,
        options: ScrcpyOptions<T>,
        deviceMessageParser: ScrcpyDeviceMessageParser2_4<T>,
    ) {
        this.#writer = writer;
        this.#options = options;
        this.#deviceMessageParser = deviceMessageParser;
    }

    async createDevice(descriptor: Uint8Array) {
        let id: number;
        if (this.#sparseIds.size > 0) {
            id = Math.min(...this.#sparseIds);
            this.#sparseIds.delete(id);
        } else {
            id = this.#devices.size;
        }

        const message = serializeUHidCreateControlMessage({
            type: this.#options.controlMessageTypes[
                ScrcpyControlMessageType.UHidCreate
            ]!,
            id,
            data: descriptor,
        });
        await Consumable.WritableStream.write(this.#writer, message);

        const output = this.#deviceMessageParser.uHidOutput.addDevice(id);

        return new UHidDevice(this.#writer, this.#options, id, output);
    }
}

export class UHidDevice<T extends object> {
    #writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;

    #options: ScrcpyOptions<T>;
    get options() {
        return this.#options;
    }

    #id: number;
    get id() {
        return this.#id;
    }

    #output: ReadableStream<ScrcpyUHidOutputDeviceMessage>;
    get output() {
        return this.#output;
    }

    constructor(
        writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>,
        options: ScrcpyOptions<T>,
        id: number,
        output: ReadableStream<ScrcpyUHidOutputDeviceMessage>,
    ) {
        this.#writer = writer;
        this.#options = options;
        this.#id = id;
        this.#output = output;
    }

    async sendReport(report: Uint8Array) {
        const message = ScrcpyUHidInputControlMessage.serialize({
            type: this.#options.controlMessageTypes[
                ScrcpyControlMessageType.UHidInput
            ]!,
            id: this.#id,
            data: report,
        });
        await Consumable.WritableStream.write(this.#writer, message);
    }
}
