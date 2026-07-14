import type { ReadableStream } from "@yume-chan/stream-extra";

import type { ScrcpyOptions2_2 } from "./options.js";

type Equal<X, Y> =
    (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
        ? true
        : false;

function expectTrue<T extends true>(value?: T) {
    void value;
}

// #region control: true
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true;
            videoSource: "display";
        }>["clipboard"],
        ReadableStream<string>
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true;
            videoSource: "display" | "camera";
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true;
            videoSource: "display" | "camera" | undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true;
            videoSource: "display" | undefined;
        }>["clipboard"],
        ReadableStream<string>
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{ control: true; videoSource: "camera" }>["clipboard"],
        undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true;
            videoSource: "camera" | undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true;
            videoSource: undefined;
        }>["clipboard"],
        ReadableStream<string>
    >
>();
// #endregion

// #region control: true | false
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | false;
            videoSource: "display";
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | false;
            videoSource: "display" | "camera";
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | false;
            videoSource: "display" | "camera" | undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | false;
            videoSource: "display" | undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | false;
            videoSource: "camera";
        }>["clipboard"],
        undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | false;
            videoSource: "camera" | undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | false;
            videoSource: undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
// #endregion

// #region control: true | false | undefined
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | false | undefined;
            videoSource: "display";
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | false | undefined;
            videoSource: "display" | "camera";
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | false | undefined;
            videoSource: "display" | "camera" | undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | false | undefined;
            videoSource: "display" | undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | false | undefined;
            videoSource: "camera";
        }>["clipboard"],
        undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | false | undefined;
            videoSource: "camera" | undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | false | undefined;
            videoSource: undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
// #endregion

// #region control: true | undefined
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | undefined;
            videoSource: "display";
        }>["clipboard"],
        ReadableStream<string>
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | undefined;
            videoSource: "display" | "camera";
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | undefined;
            videoSource: "display" | "camera" | undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | undefined;
            videoSource: "display" | undefined;
        }>["clipboard"],
        ReadableStream<string>
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | undefined;
            videoSource: "camera";
        }>["clipboard"],
        undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | undefined;
            videoSource: "camera" | undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: true | undefined;
            videoSource: undefined;
        }>["clipboard"],
        ReadableStream<string>
    >
>();
// #endregion

// #region control: false
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: false;
            videoSource: "display";
        }>["clipboard"],
        undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: false;
            videoSource: "display" | "camera";
        }>["clipboard"],
        undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: false;
            videoSource: "display" | "camera" | undefined;
        }>["clipboard"],
        undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: false;
            videoSource: "display" | undefined;
        }>["clipboard"],
        undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: false;
            videoSource: "camera";
        }>["clipboard"],
        undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: false;
            videoSource: "camera" | undefined;
        }>["clipboard"],
        undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: false;
            videoSource: undefined;
        }>["clipboard"],
        undefined
    >
>();
// #endregion

// #region control: false | undefined
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: false | undefined;
            videoSource: "display";
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: false | undefined;
            videoSource: "display" | "camera";
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: false | undefined;
            videoSource: "display" | "camera" | undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: false | undefined;
            videoSource: "display" | undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: false | undefined;
            videoSource: "camera";
        }>["clipboard"],
        undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: false | undefined;
            videoSource: "camera" | undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: false | undefined;
            videoSource: undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
// #endregion

// #region control: undefined
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: undefined;
            videoSource: "display";
        }>["clipboard"],
        ReadableStream<string>
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: undefined;
            videoSource: "display" | "camera";
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: undefined;
            videoSource: "display" | "camera" | undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: undefined;
            videoSource: "display" | undefined;
        }>["clipboard"],
        ReadableStream<string>
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: undefined;
            videoSource: "camera";
        }>["clipboard"],
        undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: undefined;
            videoSource: "camera" | undefined;
        }>["clipboard"],
        ReadableStream<string> | undefined
    >
>();
expectTrue<
    Equal<
        ScrcpyOptions2_2<{
            control: undefined;
            videoSource: undefined;
        }>["clipboard"],
        ReadableStream<string>
    >
>();
// #endregion
