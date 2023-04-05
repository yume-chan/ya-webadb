function int16LeToFloat(buffer: Uint8Array, offset: number) {
    let value = buffer[offset]! | (buffer[offset + 1]! << 8);
    value = (value << 16) >> 16;
    return value === 0x7fff ? 1 : value / 0x8000;
}

class SourceProcessor
    extends AudioWorkletProcessor
    implements AudioWorkletProcessorImpl
{
    private _sources: Uint8Array[] = [];
    private _sourceSampleCount = 0;

    public constructor() {
        super();
        this.port.onmessage = (event) => {
            const source = event.data as Uint8Array;
            this._sources.push(source);
            this._sourceSampleCount += source.length / 4;
        };
    }

    process(_inputs: Float32Array[][], outputs: Float32Array[][]) {
        const outputLeft = outputs[0]![0]!;
        const outputRight = outputs[0]![1]!;
        let outputIndex = 0;

        // Resample source to the same length as output
        // TODO: should we limit the minimum and maximum speed?
        // TODO: this simple resample method changes pitch
        // TODO: treat the input as Uint32Array so don't need to shift
        const sourceGroupIndexStep = this._sourceSampleCount > 4800 ? 1.1 : 1;
        let sourceGroupIndex = 0;
        let sourceIndex = 0;

        while (this._sources.length > 0 && outputIndex < outputLeft.length) {
            const source = this._sources[0]!;
            for (
                ;
                sourceIndex < source.length && outputIndex < outputLeft.length;
                outputIndex += 1
            ) {
                outputLeft[outputIndex] = int16LeToFloat(source, sourceIndex);
                outputRight[outputIndex] = int16LeToFloat(
                    source,
                    sourceIndex + 2
                );

                sourceGroupIndex += sourceGroupIndexStep;
                sourceIndex = (sourceGroupIndex | 0) << 2;
            }

            if (sourceIndex === source.length) {
                this._sources.shift();
                this._sourceSampleCount -= sourceIndex >> 2;
                sourceGroupIndex -= sourceIndex >> 2;
                sourceIndex -= source.length;
            } else {
                this._sources[0] = source.subarray(sourceIndex);
                this._sourceSampleCount -= sourceIndex >> 2;
                return true;
            }
        }

        return true;
    }
}

registerProcessor("source-processor", SourceProcessor);
