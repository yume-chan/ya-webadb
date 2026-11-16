import type {
    ReadableStream,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import { Consumable } from "@yume-chan/stream-extra";

import type { ScrcpyOptions } from "../../base/index.js";
import {
    ScrcpyUHidDestroyControlMessage,
    ScrcpyUHidInputControlMessage,
} from "../../control/uhid.js";
import type { ScrcpyOptions2_7 } from "../../index.js";
import { ScrcpyControlMessageType } from "../../index.js";
import type { ScrcpyUHidOutputDeviceMessage } from "../../latest.js";

import { serializeUHidCreateControlMessage } from "./serialize-uhid-create.js";

import type { DeviceMessageParser } from "./index.js";

export class UHidManager<T extends Pick<ScrcpyOptions2_7.Init, "control">> {
    #writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;
    #options: ScrcpyOptions<T>;
    #deviceMessageParser: DeviceMessageParser<T>;

    #devices = new Map<number, UHidDevice<T>>();
    #sparseIds = new Set<number>();

    constructor(
        writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>,
        options: ScrcpyOptions<T>,
        deviceMessageParser: DeviceMessageParser<T>,
    ) {
        if (!options.value.control) {
            throw new Error("control is disabled");
        }

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

        const cleanup = () => {
            this.#deviceMessageParser.uHidOutput.deleteDevice(id);
            this.#devices.delete(id);
            this.#sparseIds.add(id);
        };

        const output = this.#deviceMessageParser.uHidOutput.addDevice(id);

        const device = new UHidDevice(
            this.#writer,
            this.#options,
            this.#deviceMessageParser,
            id,
            name,
            output,
            cleanup,
        );
        this.#devices.set(id, device);

        try {
            const message = serializeUHidCreateControlMessage({
                type: this.#options.controlMessageTypes[
                    ScrcpyControlMessageType.UHidCreate
                ]!,
                id,
                name,
                data: descriptor,
            });
            await Consumable.WritableStream.write(this.#writer, message);

            return device;
        } catch (e) {
            cleanup();
            throw e;
        }
    }

    async close() {
        for (const device of this.#devices.values()) {
            await device.destroy();
        }
        this.#devices.clear();
        this.#sparseIds.clear();
    }
}

export class UHidDevice<T extends object> {
    #writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;

    #options: ScrcpyOptions<T>;
    get options() {
        return this.#options;
    }

    #deviceMessageParser: DeviceMessageParser<T>;
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

    #destroyPromise: Promise<void> | undefined;
    #destroyed = false;
    get destroyed() {
        return this.#destroyed;
    }
    #onDestroy?: (() => void) | undefined;

    #output: ReadableStream<ScrcpyUHidOutputDeviceMessage>;
    get output() {
        return this.#output;
    }

    // eslint-disable-next-line @typescript-eslint/max-params
    constructor(
        writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>,
        options: ScrcpyOptions<T>,
        deviceMessageParser: DeviceMessageParser<T>,
        id: number,
        name: string,
        output: ReadableStream<ScrcpyUHidOutputDeviceMessage>,
        onDestroy?: () => void,
    ) {
        this.#writer = writer;
        this.#options = options;
        this.#deviceMessageParser = deviceMessageParser;
        this.#id = id;
        this.#name = name;
        this.#output = output;
        this.#onDestroy = onDestroy;
    }

    async sendReport(report: Uint8Array) {
        if (this.#destroyPromise) {
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

    async #destroy() {
        const message = ScrcpyUHidDestroyControlMessage.serialize({
            id: this.#id,
            type: this.#options.controlMessageTypes[
                ScrcpyControlMessageType.UHidDestroy
            ]!,
        });
        await Consumable.WritableStream.write(this.#writer, message);

        this.#onDestroy?.();
        this.#destroyed = true;
    }

    async destroy() {
        if (this.#destroyPromise) {
            return this.#destroyPromise;
        }
        this.#destroyPromise = this.#destroy().catch((e) => {
            this.#destroyPromise = undefined;
            throw e;
        });
        return this.#destroyPromise;
    }
}
