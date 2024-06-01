export abstract class PcmPlayer<T> {
    protected abstract sourceName: string;

    #context: AudioContext;
    get outputLatency() {
        return this.#context.outputLatency;
    }

    #channelCount: number;
    #worklet: AudioWorkletNode | undefined;
    #buffers: T[] = [];
    #stopped = false;

    constructor(sampleRate: number, channelCount: number) {
        this.#context = new AudioContext({
            latencyHint: "interactive",
            sampleRate,
        });
        this.#channelCount = channelCount;
    }

    protected abstract feedCore(worklet: AudioWorkletNode, source: T): void;

    /**
     * Feed the samples to the player.
     * @param source An array of samples. It will be transferred if it's an `ArrayBuffer`,
     * or an `ArrayBufferView` that covers the whole `ArrayBuffer`. Otherwise, it will be copied.
     */
    feed(source: T) {
        if (this.#stopped) {
            throw new Error("PcmPlayer is stopped");
        }

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

        if (this.#stopped) {
            return;
        }

        this.#worklet = new AudioWorkletNode(this.#context, this.sourceName, {
            numberOfInputs: 0,
            numberOfOutputs: 1,
            outputChannelCount: [this.#channelCount],
        });
        this.#worklet.connect(this.#context.destination);

        for (const source of this.#buffers) {
            this.feedCore(this.#worklet, source);
        }
        this.#buffers.length = 0;
    }

    async stop() {
        if (this.#stopped) {
            return;
        }
        this.#stopped = true;

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
