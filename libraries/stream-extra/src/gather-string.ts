import { WritableStream } from "./stream.js";

export class GatherStringStream extends WritableStream<string> {
    // PERF: rope (concat strings) is faster than `[].join('')`
    #result = "";
    public get result() {
        return this.#result;
    }

    public constructor() {
        super({
            write: (chunk) => {
                this.#result += chunk;
            },
        });
    }
}
