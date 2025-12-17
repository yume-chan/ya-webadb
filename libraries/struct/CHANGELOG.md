# Change Log - @yume-chan/struct

## 2.3.2

### Patch Changes

-   8ba86f7: Fix an issue that some overloads of `buffer` (and `string`) ignores specified value converter

## 2.0.1

### Patch Changes

-   0bcb9b8: Fix `buffer` and `struct` may not have correct size

## 2.0.0

### Major Changes

-   b79df96: Refactor struct package to allow `struct`s to be used as `field`

### Patch Changes

-   Updated dependencies
    -   @yume-chan/no-data-view@2.0.0

## 1.0.1

### Patch Changes

-   53688d3: Use PNPM workspace and Changesets to manage the monorepo.

    Because Changesets doesn't support alpha versions (`0.x.x`), this version is `1.0.0`. Future versions will follow SemVer rules, for example, breaking API changes will introduce a new major version.

-   db8466f: Rewrite the struct API completely
-   db8466f: Improve tree-shaking by removing TypeScript enum and namespace
-   Updated dependencies [53688d3]
    -   @yume-chan/no-data-view@1.0.1

This log was last generated on Tue, 18 Jun 2024 02:49:43 GMT and should not be manually modified.

## 0.0.24

Tue, 18 Jun 2024 02:49:43 GMT

### Updates

-   Rename some internal types to make them more distinguishable

## 0.0.23

Thu, 21 Mar 2024 03:15:10 GMT

_Version update only_

## 0.0.22

Wed, 13 Dec 2023 05:57:27 GMT

_Version update only_

## 0.0.21

Fri, 25 Aug 2023 14:05:18 GMT

_Version update only_

## 0.0.20

Mon, 05 Jun 2023 02:51:41 GMT

### Updates

-   Rename `StructDeserializeStream` and `StructAsyncDeserializeStream` to `ExactReadable` and `AsyncExactReadable`. Rename its `read` method to `readExactly`. Add a `position` field so the caller can check how many bytes have been read.
-   Improve performance for decoding integers.
-   Rename `Struct#fields` to `Struct#concat`. Now `Struct#fields` returns an array of `[name: PropertyKey, definition: StructFieldDefinition<any, any, any>]` tuples.
-   Use ECMAScript private class fields syntax (supported by Chrome 74, Firefox 90, Safari 14.1 and Node.js 12.0.0).

## 0.0.19

Sun, 09 Apr 2023 05:55:33 GMT

_Version update only_

## 0.0.18

Wed, 25 Jan 2023 21:33:49 GMT

### Updates

-   Refactor number types for easier extending (see `ScrcpyFloatToInt16FieldDefinition` for an example)

## 0.0.17

Tue, 18 Oct 2022 09:32:30 GMT

_Version update only_

## 0.0.16

Sat, 28 May 2022 03:56:37 GMT

### Updates

-   Add support for custom TypeScript type for `uint8Array`
-   Upgrade TypeScript to 4.7.2 to enable Node.js ESM
-   Improve performance of `Struct#deserialize()` by up to 200%.
-   Remove `SyncBird`, it's replaced by `SyncPromise`, which is based on native Promise and is 200% faster.

## 0.0.15

Mon, 02 May 2022 04:18:01 GMT

_Version update only_

## 0.0.14

Sat, 30 Apr 2022 14:05:48 GMT

_Version update only_

## 0.0.13

Thu, 28 Apr 2022 01:23:53 GMT

### Updates

-   Fix an issue that `uint64` still deserialize to negative numbers
-   Fix an issue where `Syncbird` can't synchronously invoke `then` on some Bluebird internal methods (for example `reduce`)

## 0.0.12

Sun, 03 Apr 2022 11:18:47 GMT

_Version update only_

## 0.0.11

Sun, 03 Apr 2022 11:18:11 GMT

### Updates

-   Update to use Web Streams API
-   Improve compatibility with Node.js 12 ESM format
-   Update compatibility matrix
-   Update license year

## 0.0.10

Sun, 09 Jan 2022 15:52:20 GMT

### Updates

-   Add synchronized deserialize support

## 0.0.9

Sun, 09 Jan 2022 15:50:20 GMT

_Initial release_
