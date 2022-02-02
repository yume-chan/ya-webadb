import { PromiseResolver } from '@yume-chan/async';
import { AutoDisposable, EventEmitter } from '@yume-chan/event';

let worker: Worker | undefined;
let workerReady = false;
const pendingResolvers: PromiseResolver<TinyH264Wrapper>[] = [];
let streamId = 0;

export interface PictureReadyEventArgs {
    renderStateId: number;

    width: number;

    height: number;

    data: ArrayBuffer;
}

const pictureReadyEvent = new EventEmitter<PictureReadyEventArgs>();

export class TinyH264Wrapper extends AutoDisposable {
    public readonly streamId: number;

    private readonly pictureReadyEvent = new EventEmitter<PictureReadyEventArgs>();
    public get onPictureReady() { return this.pictureReadyEvent.event; }

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

    public override dispose() {
        super.dispose();
        worker!.postMessage({
            type: 'release',
            renderStateId: this.streamId,
        });
    }
}

export function createTinyH264Wrapper(): Promise<TinyH264Wrapper> {
    if (!worker) {
        worker = new Worker(new URL('./worker.js', import.meta.url));
        worker.addEventListener('message', (e) => {
            const { data } = e;
            switch (data.type) {
                case 'decoderReady':
                    workerReady = true;
                    for (const resolver of pendingResolvers) {
                        resolver.resolve(new TinyH264Wrapper(streamId));
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
        const resolver = new PromiseResolver<TinyH264Wrapper>();
        pendingResolvers.push(resolver);
        return resolver.promise;
    }

    const decoder = new TinyH264Wrapper(streamId);
    streamId += 1;
    return Promise.resolve(decoder);
}
