# @yume-chan/event

Provides a strongly-typed EventEmitter/Event implementation.

Inspired by TypeScript, Visual Studio Code, and more.

- [Disposable](#disposable)
- [AutoDisposable](#autodisposable)
- [DisposableList](#disposablelist)
- [EventEmitter/Event](#eventemitterevent)

## Disposable

```ts
interface Disposable {
    dispose(): void;
}
```

Represents anything that need cleanup before the garbage collector recycle it.

## AutoDisposable

```ts
class AutoDisposable implements Disposable {
    private disposables;
    constructor();
    protected addDisposable<T extends Disposable>(disposable: T): T;
    dispose(): void;
}
```

A base class for objects that need to manage multiple `Disposable`s.

Calling `dispose` on it will automatically dispose all `Disposable`s added via `addDisposable`.

Usually works like:

```ts
class MyObject extends AutoDisposable {
    private event1 = this.addDisposable(new EventEmitter<void>());

    private event2 = this.addDisposable(new EventEmitter<void>());

    public dispose() {
        // If the derived class has its own dispose logic
        // Don't forget to call super's `dispose`
        super.dispose();

        // Clean up itself.
    }
}
```

## DisposableList

```ts
class DisposableList extends AutoDisposable {
    add<T extends Disposable>(disposable: T): T;
}
```

An `AutoDisposable` that can be used alone (i.e. not as a base class).

## EventEmitter/Event

```ts
interface EventListener<TEvent, TThis, TArgs extends unknown[], TResult> {
    (this: TThis, e: TEvent, ...args: TArgs): TResult;
}

interface RemoveEventListener extends Disposable {
    (): void;
}

interface Event<TEvent, TResult = unknown> {
    (listener: EventListener<TEvent, unknown, [], TResult>): RemoveEventListener;
    <TThis, TArgs extends unknown[]>(listener: EventListener<TEvent, TThis, TArgs, TResult>, thisArg: TThis, ...args: TArgs): RemoveEventListener;
}

class EventEmitter<TEvent, TResult = unknown> implements Disposable {
    protected readonly listeners: EventListenerInfo<TEvent, TResult>[];
    constructor();
    protected addEventListener(info: EventListenerInfo<TEvent, TResult>): RemoveEventListener;
    event: Event<TEvent, TResult>;
    fire(e: TEvent): void;
    dispose(): void;
}

```

|                                     | Node.js `EventEmitter` | This `EventEmitter` |
| ----------------------------------- | ---------------------- | ------------------- |
| Can emit multiple event types       | Yes                    | No                  |
| Only trusted source can emit events | No                     | Yes                 |
| Strongly-typed                      | No                     | Yes                 |

One `EventEmitter` for one event type. So for classes that have multiple event types, multiple `EventEmitter` can be created and assigned to multiple fields.

Usually classes keep `EventEmitter`s private (using TypeScript's `private` modifier, or ECMAScript private field), only expose the `Event` interface (via `EventEmitter.event`).

Everyone can subscribe to the event using the `Event` interface, but the event can only be emitted from the `EventEmitter` class.

```ts
const emitter = new EventEmitter<void>();
const subscribe = emitter.event;
const unsubscribe = subscribe(() => {});
emitter.fire();
unsubscribe();
```

The returned `unsubscribe` is both a function and a `Disposable`, so it can be used with `AutoDisposable` or `DisposableList`.
