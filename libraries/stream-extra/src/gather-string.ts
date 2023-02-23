import { WritableStream } from "./stream.js";

export class GatherStringStream extends WritableStream<string> {
    // PERF: rope (concat strings) is faster than `[].join('')`
    private _result = "";
    public get result() {
        return this._result;
    }

    public constructor() {
        super({
            write: (chunk) => {
                this._result += chunk;
            },
        });
    }
}
