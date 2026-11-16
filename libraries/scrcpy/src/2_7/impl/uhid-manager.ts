import type {
    ReadableStream,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import { Consumable } from "@yume-chan/stream-extra";

import type { ScrcpyDeviceMessageParser2_4 } from "../../2_4/impl/device-message-parser.js";
import type { ScrcpyOptions } from "../../base/index.js";
import {
    ScrcpyUHidDestroyControlMessage,
    ScrcpyUHidInputControlMessage,
} from "../../control/uhid.js";
import { ScrcpyControlMessageType } from "../../index.js";
import type { ScrcpyUHidOutputDeviceMessage } from "../../latest.js";

import { serializeUHidCreateControlMessage } from "./serialize-uhid-create.js";

export class UHidManager<T extends object> {
    #writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;
    #options: ScrcpyOptions<T>;
    #deviceMessageParser: ScrcpyDeviceMessageParser2_4<T>;

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

    async createDevice(name: string, descriptor: Uint8Array) {
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
            name,
            data: descriptor,
        });
        await Consumable.WritableStream.write(this.#writer, message);

        const output = this.#deviceMessageParser.uHidOutput.addDevice(id);

        return new UHidDevice(
            this.#writer,
            this.#options,
            this.#deviceMessageParser,
            id,
            name,
            output,
        );
    }
}

export class UHidDevice<T extends object> {
    #writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;

    #options: ScrcpyOptions<T>;
    get options() {
        return this.#options;
    }

    #deviceMessageParser: ScrcpyDeviceMessageParser2_4<T>;
    get deviceMessageParser() {
        return this.#deviceMessageParser;
    }

    #id: number;
    get id() {
        return this.#id;
    }

    #name: string;
    get name() {
        return this.#name;
    }

    #destroyed = false;
    get destroyed() {
        return this.#destroyed;
    }

    #output: ReadableStream<ScrcpyUHidOutputDeviceMessage>;
    get output() {
        return this.#output;
    }

    // eslint-disable-next-line @typescript-eslint/max-params
    constructor(
        writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>,
        options: ScrcpyOptions<T>,
        deviceMessageParser: ScrcpyDeviceMessageParser2_4<T>,
        id: number,
        name: string,
        output: ReadableStream<ScrcpyUHidOutputDeviceMessage>,
    ) {
        this.#writer = writer;
        this.#options = options;
        this.#deviceMessageParser = deviceMessageParser;
        this.#id = id;
        this.#name = name;
        this.#output = output;
    }

    async sendReport(report: Uint8Array) {
        if (this.#destroyed) {
            throw new Error("Device is destroyed");
        }

        const message = ScrcpyUHidInputControlMessage.serialize({
            id: this.#id,
            type: this.#options.controlMessageTypes[
                ScrcpyControlMessageType.UHidInput
            ]!,
            data: report,
        });
        await Consumable.WritableStream.write(this.#writer, message);
    }

    async destroy() {
        const message = ScrcpyUHidDestroyControlMessage.serialize({
            id: this.#id,
            type: this.#options.controlMessageTypes[
                ScrcpyControlMessageType.UHidDestroy
            ]!,
        });
        await Consumable.WritableStream.write(this.#writer, message);

        this.#deviceMessageParser.uHidOutput.deleteDevice(this.#id);
        this.#destroyed = true;
    }
}
