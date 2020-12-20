export interface Disposable {
    dispose(): void;
}

export class AutoDisposable implements Disposable {
    private disposables: Disposable[] = [];

    public constructor() {
        this.dispose = this.dispose.bind(this);
    }

    protected addDisposable<T extends Disposable>(disposable: T): T {
        this.disposables.push(disposable);
        return disposable;
    }

    public dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }

        this.disposables = [];
    }
}

export class DisposableList extends AutoDisposable {
    public add<T extends Disposable>(disposable: T): T {
        return this.addDisposable(disposable);
    }
}
