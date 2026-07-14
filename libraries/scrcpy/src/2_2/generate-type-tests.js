/// <reference types="node" />

import { writeFileSync } from "node:fs";
import { format } from "prettier";

let content = `
import type {ReadableStream} from "@yume-chan/stream-extra";

import type {ScrcpyOptions2_2} from "./options.js";

type Equal<X, Y> =
    (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
        ? true
        : false;

function expectTrue<T extends true>(value?: T) { void value; }

`;

const controlValues = ["true", "false", "undefined"];
const videoSourceValues = [`"display"`, `"camera"`, "undefined"];

/**
 * @param {string[]} values
 */
function* powerSetExceptEmpty(values) {
    /**
     * @param {number} start
     * @param {string[]} combo
     * @returns {Generator<string[], void, unknown>}
     */
    function* backtrack(start, combo) {
        if (combo.length > 0) {
            yield [...combo];
        }

        for (let i = start; i < values.length; i++) {
            combo.push(values[i]);
            yield* backtrack(i + 1, combo);
            combo.pop();
        }
    }

    yield* backtrack(0, []);
}

/**
 *
 * @param {string[]} control
 * @param {string[]} videoSource
 * @param {string} expectedType
 * @returns {string}
 */
function generateCase(control, videoSource, expectedType) {
    return `
expectTrue<Equal<ScrcpyOptions2_2<{control:${control.join("|")}, videoSource:${videoSource.join("|")}}>["clipboard"], ${expectedType}>>();
    `.trim();
}

for (const control of powerSetExceptEmpty(controlValues)) {
    content += `\n// #region control: ${control.join(" | ")}\n`;

    for (const videoSource of powerSetExceptEmpty(videoSourceValues)) {
        const willDisableControl =
            videoSource.length === 1 && videoSource[0] === `"camera"`;
        if (willDisableControl) {
            content += generateCase(control, videoSource, "undefined");
            continue;
        }

        const controlDefinitelyDisabled =
            control.length === 1 && control[0] === "false";

        const mayDisableControl = videoSource.includes(`"camera"`);
        if (mayDisableControl) {
            content += generateCase(
                control,
                videoSource,
                controlDefinitelyDisabled
                    ? "undefined"
                    : "ReadableStream<string> | undefined",
            );
            continue;
        }

        const controlMaybeDisabled = control.includes("false");

        content += generateCase(
            control,
            videoSource,
            controlDefinitelyDisabled
                ? "undefined"
                : controlMaybeDisabled
                  ? "ReadableStream<string> | undefined"
                  : "ReadableStream<string>",
        );
    }

    content += `\n// #endregion\n`;
}

content = await format(content, { parser: "typescript" });

writeFileSync(new URL("./type-tests.spec.ts", import.meta.url), content);
