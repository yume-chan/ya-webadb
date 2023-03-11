import { PromiseResolver } from "@yume-chan/async";

import { TransformStream } from "./stream.js";

export class Consumable<T> {
    private readonly resolver: PromiseResolver<void>;

    public readonly value: T;
    public readonly consumed: Promise<void>;

    public constructor(value: T) {
        this.value = value;
        this.resolver = new PromiseResolver<void>();
        this.consumed = this.resolver.promise;
    }

    public consume() {
        this.resolver.resolve();
    }
}

export class ConsumableStream<T> extends TransformStream<T, Consumable<T>> {
    public constructor() {
        super({
            async transform(chunk, controller) {
                const output = new Consumable(chunk);
                controller.enqueue(output);
                await output.consumed;
            },
        });
    }
}
