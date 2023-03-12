# @yume-chan/stream-extra

Some useful extensions for working with binary streams. Conforms to the [Web Streams API](https://streams.spec.whatwg.org/).

## Find an implementation

If all of `ReadableStream`, `WritableStream` and `TransformStream` fields are available on `globalThis`, they will be used. Otherwise, the [web-streams-polyfill](https://github.com/MattiasBuelens/web-streams-polyfill) package will be used.

Google Chrome 89 and Mozilla Firefox 102 provide full support for Web Streams API natively.

In Node.js, it's not possible to load the `stream/web` module while keeping the compatibility with both Web and bundlers:

-   Webpack has poor support with Top Level Await, for example, Hot Module Replacement doesn't work when any module is using TLA.
-   Web doesn't have the `module` module, thus requires a shim in import map.

Assigning `ReadableStream`, `WritableStream` and `TransformStream` from `stream/web` module to `globalThis`, before loading this library, will still work. Other custom polyfill can also be loaded this way.

## Compatibility issue with `ReadableStream#pipeTo` and `ReadableStream#pipeThrough`

The [Web Streams API spec](https://streams.spec.whatwg.org/#readable-stream-pipe-to) specifies that `ReadableStream#pipeTo` must check the argument to be an instance of `WritableStream`, so it can optimize the performance by calling internal methods directly.

Native implementations will perform this check, so `new globalThis.ReadableStream().pipeTo(new Polyfill.WritableStream())` will throw an error.

The `WrapReadableStream` class can be used to bypass this check:

```ts
import { WrapReadableStream } from "@yume-chan/stream-extra";
import { WritableStream as PolyfillWritableStream } from "web-streams-polyfill";

const nativeReadable = new globalThis.ReadableStream();
const wrappedReadable = new WrapReadableStream(new globalThis.ReadableStream());

nativeReadable.pipeTo(new PolyfillWritableStream()); // Error
wrappedReadable.pipeTo(new PolyfillWritableStream()); // OK
```

web-streams-polyfill package's `ReadableStream#pipeTo` only uses public methods, so it can be used with any `WritableStream` implementation.

## `BufferedReadableStream`

Allowing reading specified amount of data by buffering incoming data.

It's not a Web Streams API `ReadableStream`, because `ReadableStream` doesn't allow hinting the desired read size (except using BYOB readable, but causes extra allocations for small reads).
