# @yume-chan/stream-extra

Some useful extensions for Web Streams API.

Currently it's using [web-streams-polyfill](https://github.com/MattiasBuelens/web-streams-polyfill) because it's hard to load native implementations from both browsers and Node.js. (An experimental implementation using Top Level Await is available in `native.ts`, but not exported).

## `BufferedStream`

Allowing reading specified amount of data by buffering incoming data.

It's not a Web Stream API `ReadableStream`, because `ReadableStream` doesn't allow hinting the desired read size (except using BYOB readable, but causes extra allocations for small reads).
