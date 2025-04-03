// cspell:ignore tport

import { hexToNumber, sequenceEqual } from "../../utils/index.js";
import type { AdbServerClient } from "../client.js";
import { FAIL } from "../stream.js";

export class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NetworkError";
    }
}

export class UnauthorizedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UnauthorizedError";
    }
}

export class AlreadyConnectedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AlreadyConnectedError";
    }
}

export class WirelessCommands {
    readonly #client: AdbServerClient;

    constructor(client: AdbServerClient) {
        this.#client = client;
    }

    /**
     * `adb pair <password> <address>`
     */
    async pair(address: string, password: string): Promise<void> {
        const connection = await this.#client.createConnection(
            `host:pair:${password}:${address}`,
        );
        try {
            const response = await connection.readExactly(4);
            // `response` is either `FAIL`, or 4 hex digits for length of the string
            if (sequenceEqual(response, FAIL)) {
                throw new Error(await connection.readString());
            }
            const length = hexToNumber(response);
            // Ignore the string as it's always `Successful ...`
            await connection.readExactly(length);
        } finally {
            await connection.dispose();
        }
    }

    /**
     * `adb connect <address>`
     */
    async connect(address: string): Promise<void> {
        const connection = await this.#client.createConnection(
            `host:connect:${address}`,
        );
        try {
            const response = await connection.readString();
            switch (response) {
                case `already connected to ${address}`:
                    throw new AlreadyConnectedError(response);
                case `failed to connect to ${address}`: // `adb pair` mode not authorized
                case `failed to authenticate to ${address}`: // `adb tcpip` mode not authorized
                    throw new UnauthorizedError(response);
                case `connected to ${address}`:
                    return;
                default:
                    throw new NetworkError(response);
            }
        } finally {
            await connection.dispose();
        }
    }

    /**
     * `adb disconnect <address>`
     */
    async disconnect(address: string): Promise<void> {
        const connection = await this.#client.createConnection(
            `host:disconnect:${address}`,
        );
        try {
            await connection.readString();
        } finally {
            await connection.dispose();
        }
    }
}
