import type { Event } from "@yume-chan/event";
import { StickyEventEmitter } from "@yume-chan/event";

export interface ScrcpyVideoSize {
    readonly width: number;
    readonly height: number;

    readonly sizeChanged: Event<{ width: number; height: number }>;
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

    #sizeChanged = new StickyEventEmitter<{ width: number; height: number }>();
    get sizeChanged() {
        return this.#sizeChanged.event;
    }

    setSize(width: number, height: number) {
        if (this.#width === width && this.#height === height) {
            return;
        }

        this.#width = width;
        this.#height = height;
        this.#sizeChanged.fire({ width, height });
    }

    dispose() {
        this.#sizeChanged.dispose();
    }
}
