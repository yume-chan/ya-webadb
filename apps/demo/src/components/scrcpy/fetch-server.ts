import { EventEmitter } from "@yume-chan/event";

const SERVER_URL = new URL(
    "@yume-chan/scrcpy/bin/scrcpy-server?url",
    import.meta.url
);

class FetchWithProgress {
    public readonly promise: Promise<Uint8Array>;

    private _downloaded = 0;
    public get downloaded() {
        return this._downloaded;
    }

    private _total = 0;
    public get total() {
        return this._total;
    }

    private progressEvent = new EventEmitter<
        [download: number, total: number]
    >();
    public get onProgress() {
        return this.progressEvent.event;
    }

    public constructor(url: string | URL) {
        this.promise = this.fetch(url);
    }

    private async fetch(url: string | URL) {
        const response = await globalThis.fetch(url);
        this._total = Number.parseInt(
            response.headers.get("Content-Length") ?? "0",
            10
        );
        this.progressEvent.fire([this._downloaded, this._total]);

        const reader = response.body!.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
            const result = await reader.read();
            if (result.done) {
                break;
            }
            chunks.push(result.value);
            this._downloaded += result.value.byteLength;
            this.progressEvent.fire([this._downloaded, this._total]);
        }

        this._total = chunks.reduce(
            (result, item) => result + item.byteLength,
            0
        );
        const result = new Uint8Array(this._total);
        let position = 0;
        for (const chunk of chunks) {
            result.set(chunk, position);
            position += chunk.byteLength;
        }
        return result;
    }
}

let cachedValue: FetchWithProgress | undefined;
export function fetchServer(
    onProgress?: (e: [downloaded: number, total: number]) => void
) {
    if (!cachedValue) {
        cachedValue = new FetchWithProgress(SERVER_URL);
        cachedValue.promise.catch(() => {
            cachedValue = undefined;
        });
    }

    if (onProgress) {
        cachedValue.onProgress(onProgress);
        onProgress([cachedValue.downloaded, cachedValue.total]);
    }

    return cachedValue.promise;
}
