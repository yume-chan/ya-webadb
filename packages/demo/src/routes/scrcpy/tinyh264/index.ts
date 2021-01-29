import { PromiseResolver } from '@yume-chan/async';
import { AutoDisposable, EventEmitter } from '@yume-chan/event';
import TinyH264Worker from 'worker-loader!./worker';

let worker: TinyH264Worker | undefined;
let workerReady = false;
const pendingResolvers: PromiseResolver<TinyH264Decoder>[] = [];
let streamId = 0;

export interface PictureReadyEventArgs {
    renderStateId: number;

    width: number;

    height: number;

    data: ArrayBuffer;
}

const pictureReadyEvent = new EventEmitter<PictureReadyEventArgs>();

export class TinyH264Decoder extends AutoDisposable {
    public readonly streamId: number;

    private readonly pictureReadyEvent = new EventEmitter<PictureReadyEventArgs>();
    public get pictureReady() { return this.pictureReadyEvent.event; }

    public constructor(streamId: number) {
        super();

        this.streamId = streamId;
        this.addDisposable(pictureReadyEvent.event(this.handlePictureReady, this));
    }

    private handlePictureReady(e: PictureReadyEventArgs) {
        if (e.renderStateId === this.streamId) {
            this.pictureReadyEvent.fire(e);
        }
    }

    public feed(data: ArrayBuffer) {
        worker!.postMessage({
            type: 'decode',
            data: data,
            offset: 0,
            length: data.byteLength,
            renderStateId: this.streamId,
        }, [data]);
    }

    public dispose() {
        super.dispose();
        worker!.postMessage({
            type: 'release',
            renderStateId: this.streamId,
        });
    }
}

export function createTinyH264Decoder(): Promise<TinyH264Decoder> {
    if (!worker) {
        worker = new TinyH264Worker();
        worker.addEventListener('message', (e) => {
            const { data } = e;
            switch (data.type) {
                case 'decoderReady':
                    workerReady = true;
                    for (const resolver of pendingResolvers) {
                        resolver.resolve(new TinyH264Decoder(streamId));
                        streamId += 1;
                    }
                    pendingResolvers.length = 0;
                    break;
                case 'pictureReady':
                    pictureReadyEvent.fire(data);
                    break;
            }
        });
    }

    if (!workerReady) {
        const resolver = new PromiseResolver<TinyH264Decoder>();
        pendingResolvers.push(resolver);
        return resolver.promise;
    }

    const decoder = new TinyH264Decoder(streamId);
    streamId += 1;
    return Promise.resolve(decoder);
}
