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
    #chunks: T[] = [];
    #chunkSampleCounts: number[] = [];
    #totalSampleCount = 0;

    #speedUp = false;
    #readOffset = 0;
    #inputOffset = 0;
    #outputOffset = 0;

    constructor() {
        super();
        this.port.onmessage = (event) => {
            while (this.#totalSampleCount > 16000) {
                this.#chunks.shift();
                const count = this.#chunkSampleCounts.shift()!;
                this.#totalSampleCount -= count;
            }

            const data = event.data as ArrayBuffer[];
            const [source, length] = this.createSource(data);
            this.#chunks.push(source);
            this.#chunkSampleCounts.push(length);
            this.#totalSampleCount += length;

            if (!this.#speedUp && this.#totalSampleCount > 8000) {
                this.#speedUp = true;
                this.#readOffset = 0;
                this.#inputOffset = 0;
                this.#outputOffset = 0;
            }
        };
    }

    protected abstract createSource(data: ArrayBuffer[]): [T, number];

    process(_inputs: Float32Array[][], outputs: Float32Array[][]) {
        // Stop speeding up when buffer is below 0.05s
        if (this.#speedUp && this.#totalSampleCount < 3000) {
            this.#speedUp = false;
        }

        const outputLeft = outputs[0]![0]!;
        const outputRight = outputs[0]![1]!;
        const outputLength = outputLeft.length;

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
                    const [left, right] = this.#read(
                        inputIndex - this.#readOffset,
                    );

                    const weight = WINDOW_WEIGHT_TABLE[inWindowIndex]!;
                    outputLeft[i] += left * weight;
                    outputRight[i] += right * weight;
                    totalWeight += weight;

                    inputIndex += INPUT_HOP_SIZE - OUTPUT_HOP_SIZE;
                    inWindowIndex -= OUTPUT_HOP_SIZE;
                    inWindowIndex %= WINDOW_SIZE;
                }

                if (totalWeight > 0) {
                    outputLeft[i] /= totalWeight;
                    outputRight[i] /= totalWeight;
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
            this.#copyChunks(outputLeft, outputRight);
        }

        return true;
    }

    #copyChunks(outputLeft: Float32Array, outputRight: Float32Array) {
        let outputIndex = 0;
        const outputLength = outputLeft.length;

        while (this.#chunks.length > 0 && outputIndex < outputLength) {
            let source: T | undefined = this.#chunks[0];
            let consumedSampleCount = 0;
            [source, consumedSampleCount, outputIndex] = this.copyChunk(
                source!,
                outputLeft,
                outputRight,
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

        if (outputIndex < outputLength) {
            console.log(
                `[Audio] Buffer underflow, inserting silence: ${
                    outputLength - outputIndex
                } samples`,
            );
        }
    }

    #read(offset: number): [number, number] {
        for (let i = 0; i < this.#chunks.length; i += 1) {
            const length = this.#chunkSampleCounts[i]!;

            if (offset < length) {
                return this.read(this.#chunks[i]!, offset);
            }

            offset -= length;
        }
        return [0, 0];
    }

    protected abstract read(source: T, offset: number): [number, number];

    protected abstract copyChunk(
        source: T,
        outputLeft: Float32Array,
        outputRight: Float32Array,
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
        return [source, source.length / 2];
    }

    protected override read(
        source: Int16Array,
        offset: number,
    ): [number, number] {
        return [source[offset * 2]! / 0x8000, source[offset * 2 + 1]! / 0x8000];
    }

    protected override copyChunk(
        source: Int16Array,
        outputLeft: Float32Array,
        outputRight: Float32Array,
        outputLength: number,
        outputIndex: number,
    ): [
        source: Int16Array | undefined,
        sourceIndex: number,
        outputIndex: number,
    ] {
        const sourceLength = source.length;
        let sourceSampleIndex = 0;

        while (sourceSampleIndex < sourceLength) {
            outputLeft[outputIndex] = source[sourceSampleIndex]! / 0x8000;
            outputRight[outputIndex] = source[sourceSampleIndex + 1]! / 0x8000;

            sourceSampleIndex += 2;
            outputIndex += 1;

            if (outputIndex === outputLength) {
                return [
                    sourceSampleIndex < sourceLength
                        ? source.subarray(sourceSampleIndex)
                        : undefined,
                    sourceSampleIndex / 2,
                    outputIndex,
                ];
            }
        }

        return [undefined, sourceSampleIndex / 2, outputIndex];
    }
}

class Float32SourceProcessor extends SourceProcessor<Float32Array> {
    protected override createSource(
        data: ArrayBuffer[],
    ): [Float32Array, number] {
        const source = new Float32Array(data[0]!);
        return [source, source.length / 2];
    }

    protected override read(
        source: Float32Array,
        offset: number,
    ): [number, number] {
        return [source[offset * 2]!, source[offset * 2 + 1]!];
    }

    protected override copyChunk(
        source: Float32Array,
        outputLeft: Float32Array,
        outputRight: Float32Array,
        outputLength: number,
        outputIndex: number,
    ): [
        source: Float32Array | undefined,
        sourceIndex: number,
        outputIndex: number,
    ] {
        const sourceLength = source.length;
        let sourceSampleIndex = 0;

        while (sourceSampleIndex < sourceLength) {
            outputLeft[outputIndex] = source[sourceSampleIndex]!;
            outputRight[outputIndex] = source[sourceSampleIndex + 1]!;

            sourceSampleIndex += 2;
            outputIndex += 1;

            if (outputIndex === outputLength) {
                return [
                    sourceSampleIndex < sourceLength
                        ? source.subarray(sourceSampleIndex)
                        : undefined,
                    sourceSampleIndex / 2,
                    outputIndex,
                ];
            }
        }

        return [undefined, sourceSampleIndex / 2, outputIndex];
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
    ): [number, number] {
        return [source[0]![offset]!, source[1]![offset]!];
    }

    protected override copyChunk(
        source: Float32Array[],
        outputLeft: Float32Array,
        outputRight: Float32Array,
        outputLength: number,
        outputIndex: number,
    ): [
        source: Float32Array[] | undefined,
        sourceIndex: number,
        outputIndex: number,
    ] {
        const sourceLeft = source[0]!;
        const sourceRight = source[1]!;
        const sourceLength = sourceLeft.length;
        let sourceSampleIndex = 0;

        while (sourceSampleIndex < sourceLength) {
            outputLeft[outputIndex] = sourceLeft[sourceSampleIndex]!;
            outputRight[outputIndex] = sourceRight[sourceSampleIndex]!;

            sourceSampleIndex += 1;
            outputIndex += 1;

            if (outputIndex === outputLength) {
                return [
                    sourceSampleIndex < sourceLength
                        ? source.map((channel) =>
                              channel.subarray(sourceSampleIndex),
                          )
                        : undefined,
                    sourceSampleIndex,
                    outputIndex,
                ];
            }
        }

        return [undefined, sourceSampleIndex, outputIndex];
    }
}

registerProcessor("int16-source-processor", Int16SourceProcessor);
registerProcessor("float32-source-processor", Float32SourceProcessor);
registerProcessor(
    "float32-planer-source-processor",
    Float32PlanerSourceProcessor,
);
