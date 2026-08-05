import type { Adb } from "../../adb.js";
import { Ref } from "../../utils/ref.js";

import { Error as AdbSyncError, Socket } from "./socket.js";

export class SocketPool {
    readonly #adb: Adb;
    readonly #maxSize: number;
    readonly #idleTimeout: number;
    readonly #availableSockets: Socket[] = [];
    readonly #inUseSockets = new Set<Socket>();
    #ref = new Ref({ unref: true });
    #closed = false;

    constructor(adb: Adb, maxSize = 4, idleTimeout = 60000) {
        this.#adb = adb;
        this.#maxSize = maxSize;
        this.#idleTimeout = idleTimeout;
    }

    async acquire(): Promise<Socket> {
        if (this.#closed) {
            throw new Error("SocketPool is closed");
        }
        // Try to reuse an available socket
        if (this.#availableSockets.length > 0) {
            const socket = this.#availableSockets.pop()!;
            // Clear the idle timeout
            socket.clearIdleTimer();
            this.#inUseSockets.add(socket);
            this.#ref.ref();
            return socket;
        }

        try {
            // Add ref early to keep the process alive while initializing the new socket
            this.#ref.ref();

            // Create a new socket
            const adbSocket = await this.#adb.createSocket("sync:", {
                unref: true,
            });

            if (this.#closed) {
                await adbSocket.close();
                throw new Error("SocketPool is closed");
            }

            const socket = new Socket(adbSocket, this.#adb.maxPayloadSize);
            this.#inUseSockets.add(socket);

            return socket;
        } catch (e) {
            this.#ref.unref();
            throw e;
        }
    }

    async withSocket<T>(fn: (socket: Socket) => Promise<T>): Promise<T> {
        const socket = await this.acquire();
        try {
            const result = await fn(socket);
            await this.release(socket);
            return result;
        } catch (e) {
            await this.release(socket, !(e instanceof AdbSyncError));
            throw e;
        }
    }

    async *withSocketGenerator<T>(
        fn: (socket: Socket) => AsyncGenerator<T, void, void>,
    ): AsyncGenerator<T, void, void> {
        const socket = await this.acquire();
        let discard = true;
        try {
            for await (const value of fn(socket)) {
                yield value;
            }
            discard = false;
        } catch (e) {
            discard = !(e instanceof AdbSyncError);
            throw e;
        } finally {
            // When the generator is retuned early, `discard` will have the default value of `true`,
            // the socket needs to be closed, so the server will stop sending data.
            await this.release(socket, discard);
        }
    }

    async release(socket: Socket, discard = false): Promise<void> {
        if (!this.#inUseSockets.delete(socket)) {
            return;
        }

        this.#ref.unref();

        // If discarding or we already have enough sockets in the pool, close this socket
        if (discard || this.#availableSockets.length >= this.#maxSize) {
            await socket.close();
            return;
        }

        // Otherwise, return it to the pool and start idle timeout
        socket.startIdleTimer(this.#idleTimeout, () => {
            this.#closeIdleSocket(socket);
        });
        this.#availableSockets.push(socket);
    }

    #closeIdleSocket(socket: Socket): void {
        // Remove from available sockets
        const index = this.#availableSockets.indexOf(socket);
        if (index !== -1) {
            this.#availableSockets.splice(index, 1);
            void socket.close();
        }
    }

    async dispose(): Promise<void> {
        this.#closed = true;

        // Close all available sockets
        const closePromises = this.#availableSockets.map((socket) =>
            socket.close(),
        );
        this.#availableSockets.length = 0;

        // Force close all in-use sockets immediately
        const inUseClosePromises = Array.from(this.#inUseSockets).map(
            (socket) => socket.close(),
        );
        this.#inUseSockets.clear();
        this.#ref.dispose();

        await Promise.all([...closePromises, ...inUseClosePromises]);
    }
}
