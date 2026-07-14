/// <reference types="node" />

import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
});

while (true) {
    const filePath = await readline.question("> ");
    if (!filePath) {
        console.error("Please provide a file path as an argument.");
        continue;
    }

    let content = readFileSync(filePath, "utf8");

    if (content.includes("interface Init")) {
        content = content.replaceAll(/<TVideo( extends boolean)?>/g, "");
    } else if (content.includes("export const Defaults")) {
        content = content.replaceAll("Init<true>", "Init");
    } else if (content.includes("class ScrcpyOptions")) {
        const version = content.match(/class ScrcpyOptions(.*?)</)[1];

        if (!content.includes("ComputeOptionTypes")) {
            content =
                `import {ComputeOptionTypes,computeOptionValues} from "./impl/index.js";` +
                content;
        }

        if (!content.includes("MapBoolean")) {
            content =
                `import type {MapBoolean} from "../base/index.js";` + content;
        }

        content = content.replace(
            "mergeOptionValues(init",
            "computeOptionValues(init",
        );
        content = content.replaceAll(
            "ComputeOptionTypes<TInit, typeof Defaults>",
            `ScrcpyOptions${version}.Value<TInit>`,
        );
        content = content.replace(
            "export type Init = Init_;",
            "export type Init = Init_;" +
                "\n\nexport type Value<TInit extends Init> = ComputeOptionTypes<TInit,typeof Defaults>;",
        );

        content = content.replace("mergeOptionValues,", "");
        content = content.replace("MergeOptionValues,", "");

        content = content.replace(
            /(?<=MapBooleanOption<\s*)TInit,\s*typeof Defaults/m,
            `this["value"]`,
        );

        content = content.replace(
            /this\["value"\],\s*"control"/m,
            `this["value"]["control"]`,
        );

        content = content.replace(
            "ScrcpyOptions<TInit, typeof Defaults>",
            "ScrcpyOptions<ComputeOptionTypes<TInit, typeof Defaults>>",
        );

        content = content.replace("serialize<Init<boolean>>", "serialize");

        content = content.replace(
            "type Init_<TVideo extends boolean> = Init<TVideo>;",
            "type Init_ = Init;",
        );
        content = content.replace(
            "export type Init<TVideo extends boolean = boolean> = Init_<TVideo>;",
            "export type Init = Init_;",
        );
        content = content.replace(
            "<TVideo extends boolean>",
            "<TInit extends Init = Init>",
        );
        content = content.replace(
            "ScrcpyOptions<Init<TVideo>>",
            "ScrcpyOptions<ComputeOptionTypes<TInit, typeof Defaults>>",
        );
        content = content.replace(
            "Required<Init<TVideo>>",
            "ComputeOptionTypes<TInit, typeof Defaults>",
        );
        content = content.replace(
            /constructor\(init: Init<TVideo>\) {\s*this.value = { ...Defaults, ...init }( as never)?;/m,
            `constructor(init: TInit) {
        this.value = computeOptionValues(init, Defaults);`,
        );
        content = content.replaceAll(
            /if \(this.value.(videoSource === "camera"|audioDup)\) {\s*this.value.(control|audioSource) = .*?;\s*}/gm,
            "",
        );

        content = content.replace(
            "get clipboard(): ReadableStream<string> | undefined",
            `get clipboard(): MapBoolean<this["value"]["control"],ReadableStream<string>,undefined>`,
        );
        content = content.replace(
            /return this.#clipboard(?! as never)/,
            "return this.#clipboard as never",
        );

        content = content.replaceAll(
            /(?<!}\s*)return (serialize(Inject|Back|SetClipboard|UHid)|createScrollController)/gm,
            (value) =>
                "if (!this.value.control) {" +
                'throw new Error("control is disabled");' +
                "}" +
                value,
        );

        content = content.replace(
            /\| ReadableStream<ScrcpyUHidOutputDeviceMessage>\s*\| undefined/m,
            `MapBoolean<this["value"]["control"],ReadableStream<ScrcpyUHidOutputDeviceMessage>,undefined>`,
        );
        content = content.replace(
            "return this.#uHidOutput;",
            "return this.#uHidOutput as never;",
        );
    } else {
        content = content.replace(
            /class AdbScrcpyOptions(.*?)(<TVideo extends boolean>)?\s+extends ScrcpyOptions.*?(<TVideo>)?\s*implements\s*AdbScrcpyOptions<ScrcpyOptions.*?.Init(<TVideo>)?>/m,
            "class AdbScrcpyOptions$1<TInit extends ScrcpyOptions$1.Init = ScrcpyOptions$1.Init> extends ScrcpyOptions$1<TInit> implements AdbScrcpyOptions<ScrcpyOptions$1.Value<TInit>>",
        );

        content = content.replace(
            /init: ScrcpyOptions.*?\.Init(<TVideo>)?/,
            "init: TInit",
        );

        content = content.replace(
            /type Init<TVideo extends boolean = boolean> =\s*ScrcpyOptions(.*?).Init(<TVideo>)?/m,
            "type Init = ScrcpyOptions$1.Init",
        );
    }

    writeFileSync(filePath, content);
}
