import { Disposable } from "@yume-chan/event";
import { ValueOrPromise } from "@yume-chan/struct";
import { FrameSize } from "./server";

export interface Decoder extends Disposable {
    configure(config: FrameSize): ValueOrPromise<void>;

    decode(data: BufferSource): ValueOrPromise<void>;
}

export interface DecoderConstructor {
    new(canvas: HTMLCanvasElement): Decoder;
}
