import type { Event } from "@yume-chan/event";
import { StickyEventEmitter } from "@yume-chan/event";

export interface ScrcpyVideoSize {
    readonly width: number;
    readonly height: number;

    readonly sizeChanged: Event<{
        width: number;
        height: number;
        isClientResize?: boolean | undefined;
    }>;
}

export class ScrcpyVideoSizeImpl implements ScrcpyVideoSize {
    #width: number = 0;
    get width() {
        return this.#width;
    }

    #height: number = 0;
    get height() {
        return this.#height;
    }

    #sizeChanged = new StickyEventEmitter<{
        width: number;
        height: number;
        isClientResize?: boolean | undefined;
    }>();
    get sizeChanged() {
        return this.#sizeChanged.event;
    }

    setSize(width: number, height: number, isClientResize?: boolean) {
        if (this.#width === width && this.#height === height) {
            return;
        }

        this.#width = width;
        this.#height = height;
        this.#sizeChanged.fire({ width, height, isClientResize });
    }

    dispose() {
        this.#sizeChanged.dispose();
    }
}
