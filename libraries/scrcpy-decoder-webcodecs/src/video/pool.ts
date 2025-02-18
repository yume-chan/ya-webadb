export class Pool<T> {
    #controller!: ReadableStreamDefaultController<T>;
    #readable = new ReadableStream<T>(
        {
            start: (controller) => {
                this.#controller = controller;
            },
            pull: (controller) => {
                controller.enqueue(this.#initializer());
            },
        },
        { highWaterMark: 0 },
    );
    #reader = this.#readable.getReader();

    #initializer: () => T;

    #size = 0;
    #capacity: number;

    constructor(initializer: () => T, capacity: number) {
        this.#initializer = initializer;
        this.#capacity = capacity;
    }

    async borrow() {
        const result = await this.#reader.read();
        return result.value!;
    }

    return(value: T) {
        if (this.#size < this.#capacity) {
            this.#controller.enqueue(value);
            this.#size += 1;
        }
    }
}
