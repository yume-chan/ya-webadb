import {
    AdbDaemonTransport,
    AdbPacketData,
    AdbPacketInit,
    AdbSocket,
} from "@yume-chan/adb";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";
import { PromiseResolver } from "@yume-chan/async";
import {
    Consumable,
    ConsumableWritableStream,
    PushReadableStream,
    PushReadableStreamController,
    ReadableWritablePair,
    WritableStream,
} from "@yume-chan/stream-extra";

const CredentialStore = new AdbWebCredentialStore();

const transports = new Map<string, AdbDaemonTransport>();

class RetryError extends Error {
    public constructor() {
        super("Retry");
    }
}

class SharedWorkerDaemonConnection
    implements ReadableWritablePair<AdbPacketData, Consumable<AdbPacketInit>>
{
    #serial: string;
    get serial() {
        return this.#serial;
    }

    #port = new PromiseResolver<MessagePort>();

    #readable: PushReadableStream<AdbPacketData>;
    #readableController!: PushReadableStreamController<AdbPacketData>;
    get readable() {
        return this.#readable;
    }

    #writable: WritableStream<Consumable<AdbPacketInit>>;
    #writePromise: PromiseResolver<void> | undefined;
    get writable() {
        return this.#writable;
    }

    public constructor(serial: string) {
        this.#serial = serial;
        this.#readable = new PushReadableStream((controller) => {
            this.#readableController = controller;
        });
        this.#writable = new WritableStream({
            write: async (chunk) => {
                console.log("out begin", chunk);
                while (true) {
                    try {
                        this.#writePromise = new PromiseResolver();
                        const port = await this.#port.promise;
                        console.log("out port", port);
                        port.postMessage({
                            type: "data",
                            payload: chunk.value,
                        });
                        await this.#writePromise.promise;
                        this.#writePromise = undefined;
                        chunk.consume();
                        console.log("out finish");
                        return;
                    } catch (e) {
                        if (e instanceof RetryError) {
                            continue;
                        }
                        throw e;
                    }
                }
            },
        });
    }

    public attach(port: MessagePort) {
        this.#port.resolve(port);
        port.onmessage = async (event) => {
            const message = event.data as
                | { type: "data"; payload: AdbPacketData }
                | { type: "ack" }
                | { type: "close" };
            switch (message.type) {
                case "data":
                    console.log("in", message.payload);
                    await this.#readableController.enqueue(message.payload);
                    port.postMessage({ type: "ack" });
                    break;
                case "ack":
                    this.#writePromise!.resolve();
                    break;
                case "close":
                    this.#readableController.close();
                    break;
            }
        };
    }

    public detach() {
        this.#port = new PromiseResolver();
        this.#writePromise?.reject(new RetryError());
    }
}

class SharedWorkerSocketOwner {
    #port: MessagePort;

    #socket: AdbSocket;
    #writer: WritableStreamDefaultWriter<Consumable<Uint8Array>>;
    #readAbortController = new AbortController();
    #pendingAck: PromiseResolver<void> | undefined;

    constructor(port: MessagePort, socket: AdbSocket) {
        this.#port = port;
        this.#socket = socket;
        this.#writer = socket.writable.getWriter();

        socket.readable
            .pipeTo(
                new WritableStream({
                    write: async (chunk) => {
                        this.#pendingAck = new PromiseResolver();
                        console.log("socket in write", socket.service, chunk);
                        port.postMessage({ type: "data", payload: chunk });
                        await this.#pendingAck.promise;
                        this.#pendingAck = undefined;
                        console.log("socket in write done");
                    },
                    close: () => {
                        console.log("socket in close", socket.service);
                        port.postMessage({ type: "close" });
                    },
                }),
                {
                    signal: this.#readAbortController.signal,
                }
            )
            .catch((e) => {
                if (this.#readAbortController.signal.aborted) {
                    return;
                }
                throw e;
            });

        port.onmessage = async (event) => {
            const message = event.data as
                | {
                      type: "data";
                      payload: Uint8Array;
                  }
                | { type: "ack" }
                | { type: "close" };
            switch (message.type) {
                case "data":
                    await this.write(message.payload);
                    break;
                case "ack":
                    this.ack();
                    break;
                case "close":
                    this.close();
                    break;
            }
        };
    }

    public async write(payload: Uint8Array) {
        await ConsumableWritableStream.write(this.#writer, payload);
        this.#port.postMessage({ type: "ack" });
    }

    public ack() {
        this.#pendingAck!.resolve();
    }

    public close() {
        this.#writer.releaseLock();
        this.#socket.close();
        this.#port.close();
    }
}

class SharedWorkerTransportOwner {
    #port: MessagePort;

    #transport: AdbDaemonTransport;

    constructor(port: MessagePort, transport: AdbDaemonTransport) {
        this.#port = port;
        this.#transport = transport;

        transport.disconnected.then(() => {
            port.postMessage({ type: "close" });
        });

        port.onmessage = async (event) => {
            const message = event.data as {
                type: "connect";
                id: number;
                service: string;
            };
            switch (message.type) {
                case "connect":
                    await this.connect(message.id, message.service);
                    break;
            }
        };
    }

    public async connect(id: number, service: string) {
        try {
            const socket = await this.#transport.connect(service);
            const channel = new MessageChannel();
            const server = new SharedWorkerSocketOwner(channel.port2, socket);
            this.#port.postMessage(
                {
                    type: "connect",
                    id: id,
                    result: true,
                    port: channel.port1,
                },
                [channel.port1]
            );
        } catch {
            this.#port.postMessage({
                type: "connect",
                id: id,
                result: false,
            });
        }
    }
}

declare interface SharedWorkerGlobalScope {
    onconnect: (e: MessageEvent) => void;
}

const clientToConnections = new Map<
    MessagePort,
    Set<SharedWorkerDaemonConnection>
>();
const serialToConnection = new Map<string, SharedWorkerDaemonConnection>();

async function connect(port: MessagePort, serial: string) {
    const channel = new MessageChannel();

    const messageResolver = new PromiseResolver<{
        type: "connect";
        result: boolean;
    }>();
    channel.port2.onmessage = async (event) => {
        messageResolver.resolve(event.data);
    };

    port.postMessage({ type: "connect", serial, port: channel.port1 }, [
        channel.port1,
    ]);

    const message = await messageResolver.promise;
    switch (message.type) {
        case "connect":
            if (!message.result) {
                throw new Error("Failed to connect");
            }

            if (serialToConnection.has(serial)) {
                const connection = serialToConnection.get(serial)!;
                console.log("switch", connection, "to", port);
                connection.attach(channel.port2);
                clientToConnections.get(port)!.add(connection);
            } else {
                const connection = new SharedWorkerDaemonConnection(serial);
                connection.attach(channel.port2);
                serialToConnection.set(serial, connection);
                clientToConnections.get(port)!.add(connection);

                const transport = await AdbDaemonTransport.authenticate({
                    serial,
                    connection,
                    credentialStore: CredentialStore,
                });
                transports.set(transport.serial, transport);
            }
            break;
        default:
            throw new Error("Unknown message type");
    }
}

(globalThis as unknown as SharedWorkerGlobalScope).onconnect = (e) => {
    const port = e.ports[0]!;
    clientToConnections.set(port, new Set());

    port.onmessage = async (event) => {
        const message = event.data as
            | {
                  type: "query";
                  id: number;
                  serial: string;
              }
            | { type: "disconnect" };
        switch (message.type) {
            case "query":
                if (!transports.has(message.serial)) {
                    await connect(port, message.serial);
                }

                const transport = transports.get(message.serial)!;
                const channel = new MessageChannel();
                port.postMessage(
                    {
                        type: "query-success",
                        id: message.id,
                        serial: message.serial,
                        product: transport.banner.product,
                        model: transport.banner.model,
                        device: transport.banner.device,
                        features: transport.banner.features,
                        maxPayloadSize: transport.maxPayloadSize,
                        port: channel.port1,
                    },
                    [channel.port1]
                );
                new SharedWorkerTransportOwner(channel.port2, transport);
                break;
            case "disconnect":
                for (const connection of clientToConnections.get(port)!) {
                    connection.detach();
                }
                let nextClient: MessagePort;
                for (const client of clientToConnections.keys()) {
                    if (client !== port) {
                        nextClient = client;
                        break;
                    }
                }
                await Promise.all(
                    Array.from(clientToConnections.get(port)!, (connection) =>
                        connect(nextClient, connection.serial)
                    )
                );
                clientToConnections.delete(port);
                break;
        }
    };
};
