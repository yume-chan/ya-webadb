import { EventEmitter } from "@yume-chan/event";

import { Ref } from "../utils/index.js";

import { AdbServerClient } from "./client.js";
import type { AdbServerStream } from "./stream.js";

function unorderedRemove<T>(array: T[], index: number) {
    array[index] = array[array.length - 1]!;
    array.length -= 1;
}

export class AdbServerDeviceObserverOwner {
    current: AdbServerClient.Device[] = [];

    #client: AdbServerClient;
    #stream: Promise<AdbServerStream> | undefined;
    #observers: {
        onDeviceAdd: EventEmitter<AdbServerClient.Device[]>;
        onDeviceRemove: EventEmitter<AdbServerClient.Device[]>;
        onListChange: EventEmitter<AdbServerClient.Device[]>;
        onError: EventEmitter<Error>;
    }[] = [];

    constructor(client: AdbServerClient) {
        this.#client = client;
    }

    async #receive(stream: AdbServerStream) {
        try {
            while (true) {
                const response = await stream.readString();
                const next = AdbServerClient.parseDeviceList(response);

                const added: AdbServerClient.Device[] = [];
                for (const nextDevice of next) {
                    const index = this.current.findIndex(
                        (device) =>
                            device.transportId === nextDevice.transportId,
                    );
                    if (index === -1) {
                        added.push(nextDevice);
                        continue;
                    }

                    unorderedRemove(this.current, index);
                }

                if (added.length) {
                    for (const observer of this.#observers) {
                        observer.onDeviceAdd.fire(added);
                    }
                }
                if (this.current.length) {
                    for (const observer of this.#observers) {
                        observer.onDeviceRemove.fire(this.current);
                    }
                }

                this.current = next;
                for (const observer of this.#observers) {
                    observer.onListChange.fire(this.current);
                }
            }
        } catch (e) {
            for (const observer of this.#observers) {
                observer.onError.fire(e as Error);
            }
        }
    }

    async #connect() {
        const stream = await this.#client.createConnection(
            "host:track-devices-l",
            // Each individual observer will ref depending on their options
            { unref: true },
        );

        void this.#receive(stream);

        return stream;
    }

    async #handleObserverStop(stream: AdbServerStream) {
        if (this.#observers.length === 0) {
            this.#stream = undefined;
            await stream.dispose();
        }
    }

    async createObserver(
        options?: AdbServerClient.ServerConnectionOptions,
    ): Promise<AdbServerClient.DeviceObserver> {
        if (options?.signal?.aborted) {
            throw options.signal.reason;
        }

        this.#stream ??= this.#connect();
        const stream = await this.#stream;

        if (options?.signal?.aborted) {
            await this.#handleObserverStop(stream);
            throw options.signal.reason;
        }

        const onDeviceAdd = new EventEmitter<AdbServerClient.Device[]>();
        const onDeviceRemove = new EventEmitter<AdbServerClient.Device[]>();
        const onListChange = new EventEmitter<AdbServerClient.Device[]>();
        const onError = new EventEmitter<Error>();

        const observer = { onDeviceAdd, onDeviceRemove, onListChange, onError };
        this.#observers.push(observer);

        const ref = new Ref(options);

        const stop = async () => {
            const index = self.#observers.indexOf(observer);
            if (index === -1) {
                return;
            }

            unorderedRemove(this.#observers, index);

            await this.#handleObserverStop(stream);

            ref.unref();
        };

        options?.signal?.addEventListener("abort", () => void stop());

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        return {
            onDeviceAdd: onDeviceAdd.event,
            onDeviceRemove: onDeviceRemove.event,
            onListChange: onListChange.event,
            onError: onError.event,
            get current() {
                return self.current;
            },
            stop,
        };
    }
}
