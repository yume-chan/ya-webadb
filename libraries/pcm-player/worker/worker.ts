const INPUT_HOP_SIZE = 3000;
const SCALE = 0.9;
const OUTPUT_HOP_SIZE = (INPUT_HOP_SIZE * SCALE) | 0;

const WINDOW_SIZE = 6000;
const WINDOW_WEIGHT_TABLE = new Float32Array(WINDOW_SIZE);
for (let i = 0; i < WINDOW_SIZE / 2; i += 1) {
    const value = Math.sin((i / WINDOW_SIZE) * Math.PI);
    WINDOW_WEIGHT_TABLE[i] = value;
    WINDOW_WEIGHT_TABLE[WINDOW_SIZE - i - 1] = value;
}

abstract class SourceProcessor<T>
    extends AudioWorkletProcessor
    implements AudioWorkletProcessorImpl
{
    channelCount: number;
    #readBuffer: Float32Array;

    #chunks: T[] = [];
    #chunkSampleCounts: number[] = [];
    #totalSampleCount = 0;

    #starting = true;
    #speedUp = false;
    #readOffset = 0;
    #inputOffset = 0;
    #outputOffset = 0;

    constructor(options: { outputChannelCount?: number[] }) {
        super();

        this.channelCount = options.outputChannelCount![0]!;
        this.#readBuffer = new Float32Array(this.channelCount);

        this.port.onmessage = ({ data }: MessageEvent<ArrayBuffer[]>) => {
            while (this.#totalSampleCount > 0.35 * 48000) {
                this.#chunks.shift();
                const count = this.#chunkSampleCounts.shift()!;
                this.#totalSampleCount -= count;
            }

            const [source, length] = this.createSource(data);
            this.#chunks.push(source);
            this.#chunkSampleCounts.push(length);
            this.#totalSampleCount += length;

            if (!this.#speedUp && this.#totalSampleCount > 0.25 * 48000) {
                this.#speedUp = true;
                this.#readOffset = 0;
                this.#inputOffset = 0;
                this.#outputOffset = 0;
            }
        };
    }

    protected abstract createSource(data: ArrayBuffer[]): [T, number];

    process(_inputs: Float32Array[][], [outputs]: [Float32Array[]]) {
        if (this.#starting) {
            if (this.#totalSampleCount < 0.1 * 48000) {
                return true;
            } else {
                this.#starting = false;
            }
        }

        if (this.#speedUp && this.#totalSampleCount < 0.15 * 48000) {
            this.#speedUp = false;
            this.#starting = true;
        }

        const outputLength = outputs[0]!.length;

        if (this.#speedUp) {
            for (let i = 0; i < outputLength; i += 1) {
                let totalWeight = 0;

                const firstWindow = Math.max(
                    0,
                    Math.floor(
                        (this.#outputOffset - WINDOW_SIZE) / OUTPUT_HOP_SIZE,
                    ) + 1,
                );

                let inWindowIndex =
                    this.#outputOffset - firstWindow * OUTPUT_HOP_SIZE;
                let inputIndex = firstWindow * INPUT_HOP_SIZE + inWindowIndex;

                while (inputIndex > 0 && inWindowIndex >= 0) {
                    this.#read(inputIndex - this.#readOffset);
                    const weight = WINDOW_WEIGHT_TABLE[inWindowIndex]!;
                    for (let j = 0; j < this.channelCount; j += 1) {
                        outputs[j]![i]! += this.#readBuffer[j]! * weight;
                    }
                    totalWeight += weight;

                    inputIndex += INPUT_HOP_SIZE - OUTPUT_HOP_SIZE;
                    inWindowIndex -= OUTPUT_HOP_SIZE;
                }

                if (totalWeight > 0) {
                    for (let j = 0; j < this.channelCount; j += 1) {
                        outputs[j]![i]! /= totalWeight;
                    }
                }

                this.#outputOffset += 1;
                if (firstWindow > 0) {
                    this.#outputOffset -= OUTPUT_HOP_SIZE;
                    this.#readOffset -= INPUT_HOP_SIZE;
                    this.#inputOffset += (1 - SCALE) * INPUT_HOP_SIZE;
                }
            }

            this.#inputOffset += outputLength;
            const firstChunkSampleCount = this.#chunkSampleCounts[0]!;
            if (
                firstChunkSampleCount !== undefined &&
                this.#inputOffset >= firstChunkSampleCount
            ) {
                this.#chunks.shift();
                this.#chunkSampleCounts.shift();
                this.#totalSampleCount -= firstChunkSampleCount;
                this.#readOffset += firstChunkSampleCount;
                this.#inputOffset -= firstChunkSampleCount;
            }
        } else {
            this.#copyChunks(outputs);
        }

        return true;
    }

    #copyChunks(outputs: Float32Array[]) {
        let outputIndex = 0;
        const outputLength = outputs[0]!.length;

        while (this.#chunks.length > 0 && outputIndex < outputLength) {
            let source: T | undefined = this.#chunks[0];
            let consumedSampleCount = 0;
            [source, consumedSampleCount, outputIndex] = this.copyChunk(
                source!,
                outputs,
                outputLength,
                outputIndex,
            );

            this.#totalSampleCount -= consumedSampleCount;

            if (source) {
                // Output full
                this.#chunks[0] = source;
                this.#chunkSampleCounts[0]! -= consumedSampleCount;
                return;
            }

            this.#chunks.shift();
            this.#chunkSampleCounts.shift();
        }
    }

    #read(offset: number) {
        for (let i = 0; i < this.#chunks.length; i += 1) {
            const length = this.#chunkSampleCounts[i]!;

            if (offset < length) {
                this.read(this.#chunks[i]!, offset, this.#readBuffer);
                return;
            }

            offset -= length;
        }

        this.#readBuffer.fill(0);
    }

    protected abstract read(
        source: T,
        offset: number,
        target: Float32Array,
    ): void;

    protected abstract copyChunk(
        source: T,
        outputs: Float32Array[],
        outputLength: number,
        outputIndex: number,
    ): [source: T | undefined, sourceIndex: number, outputIndex: number];
}

class Int16SourceProcessor
    extends SourceProcessor<Int16Array>
    implements AudioWorkletProcessorImpl
{
    protected override createSource(data: ArrayBuffer[]): [Int16Array, number] {
        const source = new Int16Array(data[0]!);
        return [source, source.length / this.channelCount];
    }

    protected override read(
        source: Int16Array,
        offset: number,
        target: Float32Array,
    ) {
        const sourceOffset = offset * this.channelCount;
        for (let i = 0; i < this.channelCount; i += 1) {
            target[i] = source[sourceOffset + i]! / 0x8000;
        }
    }

    protected override copyChunk(
        source: Int16Array,
        outputs: Float32Array[],
        outputLength: number,
        outputIndex: number,
    ): [
        source: Int16Array | undefined,
        sourceIndex: number,
        outputIndex: number,
    ] {
        const sourceLength = source.length;
        let sourceIndex = 0;

        while (sourceIndex < sourceLength) {
            for (let i = 0; i < this.channelCount; i += 1) {
                outputs[i]![outputIndex] = source[sourceIndex]! / 0x8000;
                sourceIndex += 1;
            }
            outputIndex += 1;

            if (outputIndex === outputLength) {
                return [
                    sourceIndex < sourceLength
                        ? source.subarray(sourceIndex)
                        : undefined,
                    sourceIndex / this.channelCount,
                    outputIndex,
                ];
            }
        }

        return [undefined, sourceIndex / this.channelCount, outputIndex];
    }
}

class Float32SourceProcessor extends SourceProcessor<Float32Array> {
    protected override createSource(
        data: ArrayBuffer[],
    ): [Float32Array, number] {
        const source = new Float32Array(data[0]!);
        return [source, source.length / this.channelCount];
    }

    protected override read(
        source: Float32Array,
        offset: number,
        target: Float32Array,
    ) {
        const sourceOffset = offset * this.channelCount;
        for (let i = 0; i < this.channelCount; i += 1) {
            target[i] = source[sourceOffset + i]!;
        }
    }

    protected override copyChunk(
        source: Float32Array,
        outputs: Float32Array[],
        outputLength: number,
        outputIndex: number,
    ): [
        source: Float32Array | undefined,
        sourceIndex: number,
        outputIndex: number,
    ] {
        const sourceLength = source.length;
        let sourceIndex = 0;

        while (sourceIndex < sourceLength) {
            for (let i = 0; i < this.channelCount; i += 1) {
                outputs[i]![outputIndex] = source[sourceIndex]!;
                sourceIndex += 1;
            }
            outputIndex += 1;

            if (outputIndex === outputLength) {
                return [
                    sourceIndex < sourceLength
                        ? source.subarray(sourceIndex)
                        : undefined,
                    sourceIndex / this.channelCount,
                    outputIndex,
                ];
            }
        }

        return [undefined, sourceIndex / this.channelCount, outputIndex];
    }
}

class Float32PlanerSourceProcessor extends SourceProcessor<Float32Array[]> {
    protected override createSource(
        data: ArrayBuffer[],
    ): [Float32Array[], number] {
        const source = data.map((channel) => new Float32Array(channel));
        return [source, source[0]!.length];
    }

    protected override read(
        source: Float32Array[],
        offset: number,
        target: Float32Array,
    ) {
        for (let i = 0; i < target.length; i += 1) {
            target[i] = source[i]![offset]!;
        }
    }

    protected override copyChunk(
        source: Float32Array[],
        outputs: Float32Array[],
        outputLength: number,
        outputIndex: number,
    ): [
        source: Float32Array[] | undefined,
        sourceIndex: number,
        outputIndex: number,
    ] {
        const sourceLength = source[0]!.length;
        let sourceIndex = 0;

        while (sourceIndex < sourceLength) {
            for (let i = 0; i < this.channelCount; i += 1) {
                outputs[i]![outputIndex] = source[i]![sourceIndex]!;
            }
            sourceIndex += 1;
            outputIndex += 1;

            if (outputIndex === outputLength) {
                return [
                    sourceIndex < sourceLength
                        ? source.map((channel) => channel.subarray(sourceIndex))
                        : undefined,
                    sourceIndex,
                    outputIndex,
                ];
            }
        }

        return [undefined, sourceIndex, outputIndex];
    }
}

registerProcessor("int16-source-processor", Int16SourceProcessor);
registerProcessor("float32-source-processor", Float32SourceProcessor);
registerProcessor(
    "float32-planer-source-processor",
    Float32PlanerSourceProcessor,
);
