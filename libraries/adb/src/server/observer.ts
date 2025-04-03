import { EventEmitter, StickyEventEmitter } from "@yume-chan/event";

import { Ref } from "../utils/index.js";

import { AdbServerClient } from "./client.js";
import type { AdbServerStream } from "./stream.js";

export function unorderedRemove<T>(array: T[], index: number) {
    if (index < 0 || index >= array.length) {
        return;
    }
    array[index] = array[array.length - 1]!;
    array.length -= 1;
}

export class AdbServerDeviceObserverOwner {
    current: readonly AdbServerClient.Device[] = [];

    readonly #client: AdbServerClient;
    #stream: Promise<AdbServerStream> | undefined;
    #observers: {
        onDeviceAdd: EventEmitter<readonly AdbServerClient.Device[]>;
        onDeviceRemove: EventEmitter<readonly AdbServerClient.Device[]>;
        onListChange: EventEmitter<readonly AdbServerClient.Device[]>;
        onError: EventEmitter<Error>;
    }[] = [];

    constructor(client: AdbServerClient) {
        this.#client = client;
    }

    async #receive(stream: AdbServerStream) {
        const response = await stream.readString();
        const next = AdbServerClient.parseDeviceList(response);

        const removed = this.current.slice();
        const added: AdbServerClient.Device[] = [];
        for (const nextDevice of next) {
            const index = removed.findIndex(
                (device) => device.transportId === nextDevice.transportId,
            );

            if (index === -1) {
                added.push(nextDevice);
                continue;
            }

            unorderedRemove(removed, index);
        }

        this.current = next;

        if (added.length) {
            for (const observer of this.#observers) {
                observer.onDeviceAdd.fire(added);
            }
        }
        if (removed.length) {
            for (const observer of this.#observers) {
                observer.onDeviceRemove.fire(removed);
            }
        }

        for (const observer of this.#observers) {
            observer.onListChange.fire(this.current);
        }
    }

    async #receiveLoop(stream: AdbServerStream) {
        try {
            while (true) {
                await this.#receive(stream);
            }
        } catch (e) {
            this.#stream = undefined;

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

        // Set `current` and `onListChange` value before returning
        await this.#receive(stream);

        // Then start receive loop
        void this.#receiveLoop(stream);

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
        options?.signal?.throwIfAborted();

        const onDeviceAdd = new EventEmitter<
            readonly AdbServerClient.Device[]
        >();
        const onDeviceRemove = new EventEmitter<
            readonly AdbServerClient.Device[]
        >();
        const onListChange = new StickyEventEmitter<
            readonly AdbServerClient.Device[]
        >();
        const onError = new StickyEventEmitter<Error>();

        const observer = { onDeviceAdd, onDeviceRemove, onListChange, onError };
        // Register `observer` before `#connect`.
        // So `#handleObserverStop` knows if there is any observer.
        this.#observers.push(observer);

        let stream: AdbServerStream;
        if (!this.#stream) {
            this.#stream = this.#connect();

            try {
                stream = await this.#stream;
            } catch (e) {
                this.#stream = undefined;
                throw e;
            }
        } else {
            stream = await this.#stream;
            onListChange.fire(this.current);
        }

        const ref = new Ref(options);

        const stop = async () => {
            unorderedRemove(this.#observers, this.#observers.indexOf(observer));
            await this.#handleObserverStop(stream);
            ref.unref();
        };

        if (options?.signal) {
            if (options.signal.aborted) {
                await stop();
                throw options.signal.reason;
            }

            options.signal.addEventListener("abort", () => void stop());
        }

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;
        return {
            onDeviceAdd: onDeviceAdd.event,
            onDeviceRemove: onDeviceRemove.event,
            onListChange: onListChange.event,
            onError: onError.event,
            get current() {
                return _this.current;
            },
            stop,
        };
    }
}
