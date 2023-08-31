const SAMPLE_RATE = 48000;

abstract class SourceProcessor<T>
    extends AudioWorkletProcessor
    implements AudioWorkletProcessorImpl
{
    #chunks: T[] = [];
    #chunkSampleCounts: number[] = [];
    #totalSampleCount = 0;
    #speedUp = false;

    constructor() {
        super();
        this.port.onmessage = (event) => {
            // Throw away old chunks when buffer is exceeding 0.2s
            while (this.#totalSampleCount > SAMPLE_RATE * 0.2) {
                this.#chunks.shift();
                const count = this.#chunkSampleCounts.shift()!;
                this.#totalSampleCount -= count;
            }

            const data = event.data as ArrayBuffer[];
            const [source, length] = this.createSource(data);
            this.#chunks.push(source);
            this.#chunkSampleCounts.push(length);
            this.#totalSampleCount += length;

            // Speed up when buffer is exceeding 0.1s
            if (this.#totalSampleCount > SAMPLE_RATE * 0.1) {
                this.#speedUp = true;
            }
        };
    }

    protected abstract createSource(data: ArrayBuffer[]): [T, number];

    process(_inputs: Float32Array[][], outputs: Float32Array[][]) {
        const outputLeft = outputs[0]![0]!;
        const outputRight = outputs[0]![1]!;
        const outputLength = outputLeft.length;
        let outputIndex = 0;

        // Stop speeding up when buffer is below 0.05s
        if (this.#speedUp && this.#totalSampleCount < SAMPLE_RATE * 0.05) {
            this.#speedUp = false;
        }

        const sourceIndexStep = this.#speedUp ? 1.02 : 1;
        let sourceIndex = 0;

        while (this.#chunks.length > 0 && outputIndex < outputLength) {
            const beginSourceIndex = sourceIndex | 0;

            let source: T | undefined = this.#chunks[0];
            [source, sourceIndex, outputIndex] = this.copyChunk(
                sourceIndex,
                sourceIndexStep,
                source!,
                outputLeft,
                outputRight,
                outputLength,
                outputIndex,
            );

            const consumedSampleCount = (sourceIndex | 0) - beginSourceIndex;
            this.#totalSampleCount -= consumedSampleCount;
            sourceIndex -= consumedSampleCount;

            if (source) {
                // Output full
                this.#chunks[0] = source;
                this.#chunkSampleCounts[0]! -= consumedSampleCount;
                return true;
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

        return true;
    }

    protected abstract copyChunk(
        sourceIndex: number,
        sourceIndexStep: number,
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

    protected override copyChunk(
        sourceIndex: number,
        sourceIndexStep: number,
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
        let sourceSampleIndex = sourceIndex << 1;

        while (sourceSampleIndex < sourceLength) {
            outputLeft[outputIndex] = source[sourceSampleIndex]! / 0x8000;
            outputRight[outputIndex] = source[sourceSampleIndex + 1]! / 0x8000;

            sourceIndex += sourceIndexStep;
            sourceSampleIndex = sourceIndex << 1;
            outputIndex += 1;

            if (outputIndex === outputLength) {
                return [
                    sourceSampleIndex < sourceLength
                        ? source.subarray(sourceSampleIndex)
                        : undefined,
                    sourceIndex,
                    outputIndex,
                ];
            }
        }

        return [undefined, sourceIndex, outputIndex];
    }
}

class Float32SourceProcessor extends SourceProcessor<Float32Array> {
    protected override createSource(
        data: ArrayBuffer[],
    ): [Float32Array, number] {
        const source = new Float32Array(data[0]!);
        return [source, source.length / 2];
    }

    protected override copyChunk(
        sourceIndex: number,
        sourceIndexStep: number,
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
        let sourceSampleIndex = sourceIndex << 1;

        while (sourceSampleIndex < sourceLength) {
            outputLeft[outputIndex] = source[sourceSampleIndex]!;
            outputRight[outputIndex] = source[sourceSampleIndex + 1]!;

            sourceIndex += sourceIndexStep;
            sourceSampleIndex = sourceIndex << 1;
            outputIndex += 1;

            if (outputIndex === outputLength) {
                return [
                    sourceSampleIndex < sourceLength
                        ? source.subarray(sourceSampleIndex)
                        : undefined,
                    sourceIndex,
                    outputIndex,
                ];
            }
        }

        return [undefined, sourceIndex, outputIndex];
    }
}

class Float32PlanerSourceProcessor extends SourceProcessor<Float32Array[]> {
    protected override createSource(
        data: ArrayBuffer[],
    ): [Float32Array[], number] {
        const source = data.map((channel) => new Float32Array(channel));
        return [source, source[0]!.length];
    }

    protected override copyChunk(
        sourceIndex: number,
        sourceIndexStep: number,
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
        let sourceSampleIndex = sourceIndex | 0;

        while (sourceSampleIndex < sourceLength) {
            outputLeft[outputIndex] = sourceLeft[sourceSampleIndex]!;
            outputRight[outputIndex] = sourceRight[sourceSampleIndex]!;

            sourceIndex += sourceIndexStep;
            sourceSampleIndex = sourceIndex | 0;
            outputIndex += 1;

            if (outputIndex === outputLength) {
                return [
                    sourceSampleIndex < sourceLength
                        ? source.map((channel) =>
                              channel.subarray(sourceSampleIndex),
                          )
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
