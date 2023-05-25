import {
    Adb,
    AdbBanner,
    AdbFeature,
    AdbIncomingSocketHandler,
    AdbPacketData,
    AdbPacketInit,
    AdbSocket,
    AdbTransport,
} from "@yume-chan/adb";
import {
    ADB_DEFAULT_DEVICE_FILTER,
    AdbDaemonWebUsbDeviceManager,
} from "@yume-chan/adb-daemon-webusb";
import { AsyncOperationManager, PromiseResolver } from "@yume-chan/async";
import {
    Consumable,
    ConsumableWritableStream,
    PushReadableStream,
    PushReadableStreamController,
    WritableStream,
} from "@yume-chan/stream-extra";
import { createSignal } from "solid-js";
import { Title } from "solid-start";

class SharedWorkerSocket implements AdbSocket {
    #port: MessagePort;

    #service: string;
    get service() {
        return this.#service;
    }

    #readable: PushReadableStream<Uint8Array>;
    #readableController!: PushReadableStreamController<Uint8Array>;
    get readable() {
        return this.#readable;
    }

    #writable: WritableStream<Consumable<Uint8Array>>;
    #pendingWrite: PromiseResolver<void> | undefined;
    get writable() {
        return this.#writable;
    }

    public constructor(port: MessagePort, service: string) {
        this.#port = port;
        this.#service = service;

        this.#readable = new PushReadableStream((controller) => {
            this.#readableController = controller;
        });
        this.#writable = new WritableStream({
            write: async (chunk) => {
                this.#pendingWrite = new PromiseResolver();
                port.postMessage({
                    type: "data",
                    payload: chunk.value,
                });
                await this.#pendingWrite.promise;
                this.#pendingWrite = undefined;
                chunk.consume();
            },
        });

        this.#port.onmessage = async (event) => {
            const message = event.data as
                | {
                      type: "data";
                      payload: Uint8Array;
                  }
                | { type: "ack" }
                | { type: "close" };
            switch (message.type) {
                case "data":
                    console.log("socket in", this.#service, message.payload);
                    await this.#readableController.enqueue(message.payload);
                    port.postMessage({ type: "ack" });
                    break;
                case "ack":
                    this.#pendingWrite!.resolve();
                    break;
                case "close":
                    this.#readableController.close();
                    break;
            }
        };
    }

    public close() {
        this.#port.postMessage({
            type: "close",
        });
        this.#port.close();
    }
}

class SharedWorkerTransport implements AdbTransport {
    #serial: string;
    get serial() {
        return this.#serial;
    }

    #maxPayloadSize: number;
    get maxPayloadSize() {
        return this.#maxPayloadSize;
    }

    #banner: AdbBanner;
    get banner() {
        return this.#banner;
    }

    #port: MessagePort;
    #operations = new AsyncOperationManager();

    #reverseTunnels = new Map<string, AdbIncomingSocketHandler>();

    #disconnected = new PromiseResolver<void>();
    get disconnected() {
        return this.#disconnected.promise;
    }

    public constructor(
        serial: string,
        maxPayloadSize: number,
        banner: AdbBanner,
        port: MessagePort
    ) {
        this.#serial = serial;
        this.#maxPayloadSize = maxPayloadSize;
        this.#banner = banner;
        this.#port = port;
        this.#port.onmessage = async (event) => {
            const message = event.data;
            switch (message.type) {
                case "connect":
                    if (message.result) {
                        this.#operations.resolve(message.id, message.port);
                    } else {
                        this.#operations.reject(
                            message.id,
                            new Error("failed to connect")
                        );
                    }
                    break;
                case "reverse-tunnel":
                    {
                        const handler = this.#reverseTunnels.get(
                            message.address
                        );
                        if (!handler) {
                            break;
                        }
                        const socket = new SharedWorkerSocket(
                            message.port,
                            message.address
                        );
                        await handler(socket);
                    }
                    break;
                case "add-reverse-tunnel":
                    if (message.result) {
                        this.#operations.resolve(message.id, message.address);
                    } else {
                        this.#operations.reject(
                            message.id,
                            new Error(message.error)
                        );
                    }
                    break;
                case "remove-reverse-tunnel":
                case "clear-reverse-tunnels":
                    if (message.result) {
                        this.#operations.resolve(message.id, undefined);
                    } else {
                        this.#operations.reject(
                            message.id,
                            new Error(message.error)
                        );
                    }
                    break;
                case "close":
                    this.#disconnected.resolve();
                    break;
            }
        };
    }

    public async connect(service: string): Promise<AdbSocket> {
        const [id, promise] = this.#operations.add<MessagePort>();
        this.#port.postMessage({
            type: "connect",
            id,
            service,
        });
        const port = await promise;
        return new SharedWorkerSocket(port, service);
    }

    public async addReverseTunnel(
        handler: AdbIncomingSocketHandler,
        address?: string
    ): Promise<string> {
        const [id, promise] = this.#operations.add<string>();
        this.#port.postMessage({
            type: "add-reverse-tunnel",
            id,
            address,
        });
        address = await promise;
        this.#reverseTunnels.set(address, handler);
        return address;
    }

    public async removeReverseTunnel(address: string): Promise<void> {
        const [id, promise] = this.#operations.add<void>();
        this.#port.postMessage({
            type: "remove-reverse-tunnel",
            id,
            address,
        });
        await promise;
        this.#reverseTunnels.delete(address);
    }

    public async clearReverseTunnels(): Promise<void> {
        const [id, promise] = this.#operations.add<void>();
        this.#port.postMessage({
            type: "clear-reverse-tunnels",
            id,
        });
        await promise;
        this.#reverseTunnels.clear();
    }

    public close() {
        this.#port.postMessage({
            type: "close",
        });
    }
}

class SharedWorkerDaemonConnectionOwner {
    #port: MessagePort;
    #connection: ReadableWritablePair<AdbPacketData, Consumable<AdbPacketInit>>;
    #writer: WritableStreamDefaultWriter<Consumable<AdbPacketInit>>;
    #pendingWrite: PromiseResolver<void> | undefined;

    constructor(
        port: MessagePort,
        connection: ReadableWritablePair<
            AdbPacketData,
            Consumable<AdbPacketInit>
        >
    ) {
        this.#port = port;
        this.#connection = connection;
        this.#writer = connection.writable.getWriter();

        this.#connection.readable.pipeTo(
            new WritableStream<AdbPacketData>({
                write: async (chunk) => {
                    console.log("connection in", chunk);
                    this.#pendingWrite = new PromiseResolver();
                    this.#port.postMessage({
                        type: "data",
                        payload: chunk,
                    });
                    await this.#pendingWrite.promise;
                    this.#pendingWrite = undefined;
                },
                close: () => {
                    this.#port.postMessage({
                        type: "close",
                    });
                },
            })
        );

        this.#port.onmessage = async (event) => {
            const message = event.data as
                | { type: "data"; payload: AdbPacketInit }
                | { type: "ack" };
            switch (message.type) {
                case "data":
                    console.log("connection out", message.payload);
                    await ConsumableWritableStream.write(
                        this.#writer,
                        message.payload
                    );
                    this.#port.postMessage({
                        type: "ack",
                    });
                    break;
                case "ack":
                    this.#pendingWrite!.resolve();
                    break;
            }
        };
    }
}

export default function Home() {
    const [adb, setAdb] = createSignal<Adb>();

    let operations = new AsyncOperationManager();
    let port!: MessagePort;
    if (typeof window !== "undefined") {
        const worker = new SharedWorker(
            new URL("../components/worker.ts", import.meta.url),
            {
                type: "module",
            }
        );
        port = worker.port;
        port.onmessage = async (event) => {
            const message = event.data as
                | {
                      type: "query-success";
                      id: number;
                      serial: string;
                      product: string | undefined;
                      model: string | undefined;
                      device: string | undefined;
                      features: AdbFeature[];
                      maxPayloadSize: number;
                      port: MessagePort;
                  }
                | { type: "query-error"; id: number; error: string }
                | {
                      type: "connect";
                      serial: string;
                      port: MessagePort;
                  };
            switch (message.type) {
                case "query-success":
                    operations.resolve(
                        message.id,
                        new SharedWorkerTransport(
                            message.serial,
                            message.maxPayloadSize,
                            new AdbBanner(
                                message.product,
                                message.model,
                                message.device,
                                message.features
                            ),
                            message.port
                        )
                    );
                    break;
                case "query-error":
                    operations.reject(message.id, new Error(message.error));
                    break;
                case "connect":
                    {
                        const [device] =
                            await AdbDaemonWebUsbDeviceManager.BROWSER!.getDevices(
                                [
                                    {
                                        ...ADB_DEFAULT_DEVICE_FILTER,
                                        serialNumber: message.serial,
                                    },
                                ]
                            );
                        if (!device) {
                            message.port.postMessage({
                                type: "connect",
                                result: false,
                            });
                            message.port.close();
                            return;
                        }

                        const connection = await device.connect();
                        new SharedWorkerDaemonConnectionOwner(
                            message.port,
                            connection
                        );
                        message.port.postMessage({
                            type: "connect",
                            result: true,
                        });
                    }
                    break;
            }
        };

        window.addEventListener("beforeunload", () => {
            port.postMessage({
                type: "disconnect",
            });
        });
    }

    const handleClick = async () => {
        const device =
            await AdbDaemonWebUsbDeviceManager.BROWSER!.requestDevice();
        if (!device) {
            return;
        }
        const [id, promise] = operations.add<SharedWorkerTransport>();
        port.postMessage({
            type: "query",
            id,
            serial: device.serial,
        });
        const transport = await promise;
        const adb = new Adb(transport);
        setAdb(adb);

        setInterval(async () => {
            const model = await adb.getProp("ro.product.model");
            console.log("model:", model);
        }, 1000);
    };

    const handleDisconnect = async () => {
        const _adb = adb();
        if (!_adb) {
            return;
        }
        await _adb.close();
        setAdb(undefined);
    };

    return (
        <main>
            <Title>Tango</Title>
            <div>{adb() ? "connected" : "disconnected"}</div>
            {adb() ? (
                <>
                    <button onClick={handleDisconnect}>Disconnect</button>
                </>
            ) : (
                <button onClick={handleClick}>Connect</button>
            )}
        </main>
    );
}
