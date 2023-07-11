export interface Disposable {
    dispose(): void;
}

export class AutoDisposable implements Disposable {
    #disposables: Disposable[] = [];

    constructor() {
        this.dispose = this.dispose.bind(this);
    }

    protected addDisposable<T extends Disposable>(disposable: T): T {
        this.#disposables.push(disposable);
        return disposable;
    }

    dispose() {
        for (const disposable of this.#disposables) {
            disposable.dispose();
        }

        this.#disposables = [];
    }
}

export class DisposableList extends AutoDisposable {
    add<T extends Disposable>(disposable: T): T {
        return this.addDisposable(disposable);
    }
}
