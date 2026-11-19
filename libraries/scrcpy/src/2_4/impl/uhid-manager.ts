import type {
    ReadableStream,
    WritableStreamDefaultWriter,
} from "@yume-chan/stream-extra";
import { Consumable } from "@yume-chan/stream-extra";

import type {
    ScrcpyOptions,
    ScrcpyUHidDevice,
    ScrcpyUHidManager,
} from "../../base/index.js";
import { ScrcpyControlMessageType } from "../../base/index.js";
import { ScrcpyUHidInputControlMessage } from "../../control/uhid.js";
import type { ScrcpyUHidOutputDeviceMessage } from "../../latest.js";
import type { ScrcpyOptions2_4 } from "../options.js";

import type { DeviceMessageParser } from "./device-message-parser.js";
import { serializeUHidCreateControlMessage } from "./serialize-uhid-create.js";

export class UHidManager<
    T extends Pick<ScrcpyOptions2_4.Init, "control">,
> implements ScrcpyUHidManager {
    #writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;
    #options: ScrcpyOptions<T>;
    #deviceMessageParser: DeviceMessageParser<T>;
    get deviceMessageParser() {
        return this.#deviceMessageParser;
    }

    #id = 0;

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

    async createDevice({ descriptor }: { descriptor: Uint8Array }) {
        const id = this.#id;
        this.#id += 1;

        const output = this.#deviceMessageParser.uHidOutput.addDevice(id);

        try {
            const message = serializeUHidCreateControlMessage({
                type: this.#options.controlMessageTypes[
                    ScrcpyControlMessageType.UHidCreate
                ]!,
                id,
                data: descriptor,
            });
            await Consumable.WritableStream.write(this.#writer, message);

            return new UHidDevice(this.#writer, this.#options, id, output);
        } catch (e) {
            this.#deviceMessageParser.uHidOutput.deleteDevice(id);
            throw e;
        }
    }
}

export class UHidDevice<T extends object> implements ScrcpyUHidDevice {
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

    async sendReport(report: Uint8Array): Promise<undefined> {
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
