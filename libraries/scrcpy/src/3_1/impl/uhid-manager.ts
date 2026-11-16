import type {
    ReadableStream,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import { Consumable, MaybeConsumable } from "@yume-chan/stream-extra";

import type { ScrcpyOptions } from "../../base/index.js";
import {
    ScrcpyUHidDestroyControlMessage,
    ScrcpyUHidInputControlMessage,
} from "../../control/uhid.js";
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

    async createDevice(
        name: string,
        vendorId: number,
        productId: number,
        descriptor: Uint8Array,
    ) {
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
            name,
            vendorId,
            productId,
            data: descriptor,
        });
        await MaybeConsumable.WritableStream.write(this.#writer, message);

        const output = this.#options.uHidOutput?.addDevice(id);

        return new UHidDevice(
            this.#writer,
            this.#options,
            id,
            name,
            vendorId,
            productId,
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

    #id: number;
    get id() {
        return this.#id;
    }

    #name: string;
    get name() {
        return this.#name;
    }

    #vendorId: number;
    get vendorId() {
        return this.#vendorId;
    }

    #productId: number;
    get productId() {
        return this.#productId;
    }

    #destroyed = false;
    get destroyed() {
        return this.#destroyed;
    }

    #output: this["options"]["uHidOutput"] extends undefined
        ? undefined
        : ReadableStream<ScrcpyUHidOutputDeviceMessage>;
    get output() {
        return this.#output;
    }

    // eslint-disable-next-line @typescript-eslint/max-params
    constructor(
        writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>,
        options: ScrcpyOptions<T>,
        id: number,
        name: string,
        vendorId: number,
        productId: number,
        output: ReadableStream<ScrcpyUHidOutputDeviceMessage> | undefined,
    ) {
        this.#writer = writer;
        this.#options = options;
        this.#id = id;
        this.#name = name;
        this.#vendorId = vendorId;
        this.#productId = productId;
        this.#output = output as never;
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

        this.#options.uHidOutput?.deleteDevice(this.#id);
        this.#destroyed = true;
    }
}
