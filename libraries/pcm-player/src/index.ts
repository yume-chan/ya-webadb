export abstract class PcmPlayer<T> {
    protected abstract sourceName: string;

    private _context: AudioContext;
    private _worklet: AudioWorkletNode | undefined;
    private _buffer: T[] = [];

    constructor(sampleRate: number) {
        this._context = new AudioContext({
            latencyHint: "interactive",
            sampleRate,
        });
    }

    protected abstract feedCore(worklet: AudioWorkletNode, source: T): void;

    public feed(source: T) {
        if (this._worklet === undefined) {
            this._buffer.push(source);
            return;
        }

        this.feedCore(this._worklet, source);
    }

    public async start() {
        await this._context.audioWorklet.addModule(
            new URL("./worker.js", import.meta.url)
        );

        this._worklet = new AudioWorkletNode(this._context, this.sourceName, {
            numberOfInputs: 0,
            numberOfOutputs: 1,
            outputChannelCount: [2],
        });
        this._worklet.connect(this._context.destination);

        for (const source of this._buffer) {
            this.feedCore(this._worklet, source);
        }
        this._buffer.length = 0;
    }

    async stop() {
        this._worklet?.disconnect();
        this._worklet = undefined;

        await this._context.close();
    }
}

export class Int16PcmPlayer extends PcmPlayer<Int16Array> {
    protected override sourceName = "int16-source-processor";

    protected override feedCore(worklet: AudioWorkletNode, source: Int16Array) {
        if (
            source.byteOffset !== 0 ||
            source.byteLength !== source.buffer.byteLength
        ) {
            source = source.slice();
        }

        const { buffer } = source;
        worklet.port.postMessage([buffer], [buffer]);
    }
}

export class Float32PcmPlayer extends PcmPlayer<Float32Array> {
    protected override sourceName = "float32-source-processor";

    protected override feedCore(
        worklet: AudioWorkletNode,
        source: Float32Array
    ) {
        if (
            source.byteOffset !== 0 ||
            source.byteLength !== source.buffer.byteLength
        ) {
            source = source.slice();
        }

        const { buffer } = source;
        worklet.port.postMessage([buffer], [buffer]);
    }
}

export class Float32PlanerPcmPlayer extends PcmPlayer<Float32Array[]> {
    protected override sourceName = "float32-planer-source-processor";

    protected override feedCore(
        worklet: AudioWorkletNode,
        source: Float32Array[]
    ) {
        const buffers = source.map((channel) => {
            if (
                channel.byteOffset !== 0 ||
                channel.byteLength !== channel.buffer.byteLength
            ) {
                channel = channel.slice();
            }
            return channel.buffer;
        });
        worklet.port.postMessage(buffers, buffers);
    }
}
