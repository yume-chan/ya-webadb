// cspell:ignore mdns

import type { AdbServerClient } from "../client.js";

export class MDnsCommands {
    readonly #client: AdbServerClient;

    constructor(client: AdbServerClient) {
        this.#client = client;
    }

    async check() {
        const connection =
            await this.#client.createConnection("host:mdns:check");
        try {
            const response = await connection.readString();
            return !response.startsWith("ERROR:");
        } finally {
            await connection.dispose();
        }
    }

    async getServices() {
        const connection =
            await this.#client.createConnection("host:mdns:services");
        try {
            const response = await connection.readString();
            return response
                .split("\n")
                .filter(Boolean)
                .map((line) => {
                    const parts = line.split("\t");
                    return {
                        name: parts[0]!,
                        service: parts[1]!,
                        address: parts[2]!,
                    };
                });
        } finally {
            await connection.dispose();
        }
    }
}
