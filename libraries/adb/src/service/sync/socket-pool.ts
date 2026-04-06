import type { Adb } from "../../adb.js";

import { Socket } from "./socket.js";

export class SocketPool {
    readonly #adb: Adb;
    readonly #maxSize: number;
    readonly #idleTimeout: number;
    readonly #availableSockets: Socket[] = [];
    readonly #inUseSockets = new Set<Socket>();
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
            return socket;
        }

        // Create a new socket
        const adbSocket = await this.#adb.createSocket("sync:");
        const socket = new Socket(adbSocket, this.#adb.maxPayloadSize);
        this.#inUseSockets.add(socket);
        return socket;
    }

    async release(socket: Socket, discard = false): Promise<void> {
        this.#inUseSockets.delete(socket);

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
        const inUseClosePromises = Array.from(this.#inUseSockets).map((socket) =>
            socket.close(),
        );
        this.#inUseSockets.clear();

        await Promise.all([...closePromises, ...inUseClosePromises]);
    }
}
