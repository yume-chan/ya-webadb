export class AudioPlayer {
    private _context: AudioContext;
    private _worklet: AudioWorkletNode | undefined;

    constructor(sampleRate: number) {
        this._context = new AudioContext({
            latencyHint: "interactive",
            sampleRate,
        });
    }

    public feed(data: Uint8Array) {
        this._worklet!.port.postMessage(data.slice());
    }

    public async start() {
        // https://github.com/webpack/webpack/issues/11543
        await this._context.audioWorklet.addModule(
            "data:application/javascript;charset=utf8," +
                encodeURIComponent(`"use strict";
            /////////////////////////////
            /// AudioWorklet APIs
            /////////////////////////////
            function convertInt16LeToFloat(buffer, offset) {
                let value = buffer[offset] | (buffer[offset + 1] << 8);
                value = (value << 16) >> 16;
                return value === 0x7fff ? 1 : value / 0x8000;
                // return value / 0x8000 - 1;
            }
            class SourceProcessor extends AudioWorkletProcessor {
                constructor() {
                    super();
                    this._data = [];
                    this.port.onmessage = (event) => {
                        this._data.push(event.data);
                    };
                }
                process(_inputs, outputs, _parameters) {
                    const leftOutput = outputs[0][0];
                    const rightOutput = outputs[0][1];
                    let outputOffset = 0;
                    while (this._data.length > 0 && outputOffset < leftOutput.length) {
                        const data = this._data[0];
                        let dataOffset = 0;
                        for (; dataOffset < data.length && outputOffset < leftOutput.length; outputOffset += 1) {
                            leftOutput[outputOffset] = convertInt16LeToFloat(data, dataOffset);
                            dataOffset += 2;
                            rightOutput[outputOffset] = convertInt16LeToFloat(data, dataOffset);
                            dataOffset += 2;
                        }
                        if (dataOffset === data.length) {
                            this._data.shift();
                        }
                        else {
                            this._data[0] = data.slice(dataOffset);
                        }
                    }
                    return true;
                }
            }
            registerProcessor("source-processor", SourceProcessor);
            `)
        );
        this._worklet = new AudioWorkletNode(
            this._context,
            "source-processor",
            { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] }
        );
        this._worklet.connect(this._context.destination);
    }

    stop() {
        this._worklet?.disconnect();
    }
}
