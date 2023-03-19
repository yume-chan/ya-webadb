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
        this._worklet?.port.postMessage(data.slice());
    }

    public async start() {
        await this._context.audioWorklet.addModule(
            new URL("./worker.js", import.meta.url)
        );
        this._worklet = new AudioWorkletNode(
            this._context,
            "source-processor",
            { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] }
        );
        this._worklet.connect(this._context.destination);
    }

    async stop() {
        this._worklet?.disconnect();
        this._worklet = undefined;

        await this._context.close();
    }
}
