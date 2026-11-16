import type {
    ReadableStream,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import { Consumable, MaybeConsumable } from "@yume-chan/stream-extra";

import type { ScrcpyOptions } from "../../base/index.js";
import { ScrcpyUHidInputControlMessage } from "../../control/uhid.js";
import { ScrcpyControlMessageType } from "../../index.js";
import type { ScrcpyUHidOutputDeviceMessage } from "../../latest.js";

import type { UHidCreateControlMessage } from "./serialize-uhid-create.js";

export class UHidManager<T extends object> {
    #writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;
    #options: ScrcpyOptions<T>;
    #serializeUHidCreateControlMessage: (
        message: UHidCreateControlMessage,
    ) => MaybeConsumable<Uint8Array>;

    #devices = new Map<number, Uint8Array>();
    #sparseIds = new Set<number>();

    constructor(
        writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>,
        options: ScrcpyOptions<T>,
        serializeUHidCreateControlMessage: (
            message: UHidCreateControlMessage,
        ) => MaybeConsumable<Uint8Array>,
    ) {
        this.#writer = writer;
        this.#options = options;
        this.#serializeUHidCreateControlMessage =
            serializeUHidCreateControlMessage;
    }

    async createDevice(descriptor: Uint8Array) {
        let id: number;
        if (this.#sparseIds.size > 0) {
            id = Math.min(...this.#sparseIds);
            this.#sparseIds.delete(id);
        } else {
            id = this.#devices.size;
        }

        const message = this.#serializeUHidCreateControlMessage({
            type: this.#options.controlMessageTypes[
                ScrcpyControlMessageType.UHidCreate
            ]!,
            id,
            data: descriptor,
        });
        await MaybeConsumable.WritableStream.write(this.#writer, message);

        const output = this.#options.uHidOutput?.addDevice(id);

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

    #output: this["options"]["uHidOutput"] extends undefined
        ? undefined
        : ReadableStream<ScrcpyUHidOutputDeviceMessage>;
    get output() {
        return this.#output;
    }

    constructor(
        writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>,
        options: ScrcpyOptions<T>,
        id: number,
        output: ReadableStream<ScrcpyUHidOutputDeviceMessage> | undefined,
    ) {
        this.#writer = writer;
        this.#options = options;
        this.#id = id;
        this.#output = output as never;
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
