import { PromiseResolver } from "@yume-chan/async";
import { AutoDisposable, EventEmitter } from "@yume-chan/event";
import type { Disposable } from "@yume-chan/event";

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

const PICTURE_READY_SUBSCRIPTIONS = new Map<
    number,
    (e: PictureReadyEventArgs) => void
>();

function subscribePictureReady(
    streamId: number,
    handler: (e: PictureReadyEventArgs) => void
): Disposable {
    PICTURE_READY_SUBSCRIPTIONS.set(streamId, handler);

    return {
        dispose() {
            PICTURE_READY_SUBSCRIPTIONS.delete(streamId);
        },
    };
}

export class TinyH264Wrapper extends AutoDisposable {
    public readonly streamId: number;

    private readonly pictureReadyEvent =
        new EventEmitter<PictureReadyEventArgs>();
    public get onPictureReady() {
        return this.pictureReadyEvent.event;
    }

    public constructor(streamId: number) {
        super();

        this.streamId = streamId;
        this.addDisposable(
            subscribePictureReady(streamId, this.handlePictureReady)
        );
    }

    private handlePictureReady = (e: PictureReadyEventArgs) => {
        this.pictureReadyEvent.fire(e);
    };

    public feed(data: ArrayBuffer) {
        worker!.postMessage(
            {
                type: "decode",
                data: data,
                offset: 0,
                length: data.byteLength,
                renderStateId: this.streamId,
            },
            [data]
        );
    }

    public override dispose() {
        super.dispose();
        worker!.postMessage({
            type: "release",
            renderStateId: this.streamId,
        });
    }
}

interface TinyH264MessageBase {
    type: string;
}

interface TinyH264DecoderReadyMessage extends TinyH264MessageBase {
    type: "decoderReady";
}

interface TinyH264PictureReadyMessage
    extends TinyH264MessageBase,
        PictureReadyEventArgs {
    type: "pictureReady";
}

type TinyH264Message =
    | TinyH264DecoderReadyMessage
    | TinyH264PictureReadyMessage;

export function createTinyH264Wrapper(): Promise<TinyH264Wrapper> {
    if (!worker) {
        worker = new Worker(new URL("./worker.js", import.meta.url));
        worker.addEventListener(
            "message",
            ({ data }: MessageEvent<TinyH264Message>) => {
                switch (data.type) {
                    case "decoderReady":
                        workerReady = true;
                        for (const resolver of pendingResolvers) {
                            resolver.resolve(new TinyH264Wrapper(streamId));
                            streamId += 1;
                        }
                        pendingResolvers.length = 0;
                        break;
                    case "pictureReady":
                        PICTURE_READY_SUBSCRIPTIONS.get(data.renderStateId)?.(
                            data
                        );
                        break;
                }
            }
        );
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
