class S16SourceProcessor
    extends AudioWorkletProcessor
    implements AudioWorkletProcessorImpl
{
    private _sources: Int16Array[] = [];
    private _sourceSampleCount = 0;

    public constructor() {
        super();
        this.port.onmessage = (event) => {
            const source = new Int16Array(event.data as ArrayBuffer);
            this._sources.push(source);
            this._sourceSampleCount += source.length / 2;
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
        const sourceGroupIndexStep = this._sourceSampleCount > 48000 ? 1.02 : 1;
        let sourceGroupIndex = 0;
        let sourceIndex = 0;

        while (this._sources.length > 0 && outputIndex < outputLeft.length) {
            const source = this._sources[0]!;
            for (
                ;
                sourceIndex < source.length && outputIndex < outputLeft.length;
                sourceGroupIndex += sourceGroupIndexStep,
                    sourceIndex = sourceGroupIndex << 1,
                    outputIndex += 1
            ) {
                outputLeft[outputIndex] = source[sourceIndex]! / 0x8000;
                outputRight[outputIndex] = source[sourceIndex + 1]! / 0x8000;
            }
            if (sourceIndex >= source.length) {
                this._sources.shift();
                this._sourceSampleCount -= source.length / 2;
                sourceGroupIndex -= source.length / 2;
                sourceIndex = sourceGroupIndex << 1;
            } else {
                this._sources[0] = source.subarray(sourceIndex);
                this._sourceSampleCount -= sourceIndex / 2;
                return true;
            }
        }

        return true;
    }
}

class F32PlanerSourceProcessor
    extends AudioWorkletProcessor
    implements AudioWorkletProcessorImpl
{
    private _sources: Float32Array[][] = [];
    private _sourceSampleCount = 0;

    public constructor() {
        super();
        this.port.onmessage = (event) => {
            const source = (event.data as ArrayBuffer[]).map(
                (channel) => new Float32Array(channel)
            );
            this._sources.push(source);
            this._sourceSampleCount += source[0]!.length;
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
        const sourceIndexStep = this._sourceSampleCount > 48000 ? 1.02 : 1;
        let sourceIndexFractional = 0;
        let sourceIndex = 0;

        while (this._sources.length > 0 && outputIndex < outputLeft.length) {
            const source = this._sources[0]!;
            const sourceLeft = source[0]!;
            const sourceRight = source[1]!;
            for (
                ;
                sourceIndexFractional < sourceLeft.length &&
                outputIndex < outputLeft.length;
                sourceIndexFractional += sourceIndexStep,
                    sourceIndex = sourceIndexFractional | 0,
                    outputIndex += 1
            ) {
                outputLeft[outputIndex] = sourceLeft[sourceIndex]!;
                outputRight[outputIndex] = sourceRight[sourceIndex]!;
            }
            if (sourceIndex >= sourceLeft.length) {
                this._sources.shift();
                this._sourceSampleCount -= sourceLeft.length;
                sourceIndexFractional -= sourceLeft.length;
            } else {
                this._sources[0] = source.map((channel) =>
                    channel.subarray(sourceIndex)
                );
                this._sourceSampleCount -= sourceIndex;
                return true;
            }
        }

        return true;
    }
}

registerProcessor("s16-source-processor", S16SourceProcessor);
registerProcessor("f32-planer-source-processor", F32PlanerSourceProcessor);
