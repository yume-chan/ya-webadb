function convertInt16LeToFloat(buffer: Uint8Array, offset: number) {
    let value = buffer[offset]! | (buffer[offset + 1]! << 8);
    value = (value << 16) >> 16;
    return value === 0x7fff ? 1 : value / 0x8000;
}

class SourceProcessor
    extends AudioWorkletProcessor
    implements AudioWorkletProcessorImpl
{
    private _data: Uint8Array[] = [];

    public constructor() {
        super();
        this.port.onmessage = (event) => {
            this._data.push(event.data);
        };
    }

    process(_inputs: Float32Array[][], outputs: Float32Array[][]) {
        const leftOutput = outputs[0]![0]!;
        const rightOutput = outputs[0]![1]!;

        let outputOffset = 0;
        while (this._data.length > 0 && outputOffset < leftOutput.length) {
            const data = this._data[0]!;
            let dataOffset = 0;
            for (
                ;
                dataOffset < data.length && outputOffset < leftOutput.length;
                outputOffset += 1
            ) {
                leftOutput[outputOffset] = convertInt16LeToFloat(
                    data,
                    dataOffset
                );
                dataOffset += 2;
                rightOutput[outputOffset] = convertInt16LeToFloat(
                    data,
                    dataOffset
                );
                dataOffset += 2;
            }

            if (dataOffset === data.length) {
                this._data.shift();
            } else {
                this._data[0] = data.slice(dataOffset);
            }
        }

        return true;
    }
}

registerProcessor("source-processor", SourceProcessor);
