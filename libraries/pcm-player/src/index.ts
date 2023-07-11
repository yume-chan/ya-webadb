export abstract class PcmPlayer<T> {
    protected abstract sourceName: string;

    #context: AudioContext;
    #worklet: AudioWorkletNode | undefined;
    #buffers: T[] = [];

    constructor(sampleRate: number) {
        this.#context = new AudioContext({
            latencyHint: "interactive",
            sampleRate,
        });
    }

    protected abstract feedCore(worklet: AudioWorkletNode, source: T): void;

    feed(source: T) {
        if (this.#worklet === undefined) {
            this.#buffers.push(source);
            return;
        }

        this.feedCore(this.#worklet, source);
    }

    async start() {
        await this.#context.audioWorklet.addModule(
            new URL("./worker.js", import.meta.url),
        );

        this.#worklet = new AudioWorkletNode(this.#context, this.sourceName, {
            numberOfInputs: 0,
            numberOfOutputs: 1,
            outputChannelCount: [2],
        });
        this.#worklet.connect(this.#context.destination);

        for (const source of this.#buffers) {
            this.feedCore(this.#worklet, source);
        }
        this.#buffers.length = 0;
    }

    async stop() {
        this.#worklet?.disconnect();
        this.#worklet = undefined;

        await this.#context.close();
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
        source: Float32Array,
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
        source: Float32Array[],
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
