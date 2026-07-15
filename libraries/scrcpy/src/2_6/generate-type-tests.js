/// <reference types="node" />

import { writeFileSync } from "node:fs";
import { format } from "prettier";

let content = `
import type {ScrcpyOptions2_6} from "./options.js";

type Equal<X, Y> =
    (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
        ? true
        : false;

function expectTrue<T extends true>(value?: T) { void value; }

`;

const audioDupValues = ["true", "false", "undefined"];
const audioSourceValues = [`"output"`, `"playback"`, `"mic"`, "undefined"];

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
 * @param {string[]} audioDup
 * @param {string[]} audioSource
 * @param {string} expectedType
 * @returns {string}
 */
function generateCase(audioDup, audioSource, expectedType) {
    return `
expectTrue<Equal<ScrcpyOptions2_6<{audioDup:${audioDup.join("|")}, audioSource:${audioSource.join("|")}}>["value"]["audioSource"], ${expectedType}>>();
    `.trim();
}

for (const audioDup of powerSetExceptEmpty(audioDupValues)) {
    content += `\n// #region audioDup: ${audioDup.join(" | ")}\n`;

    for (const audioSource of powerSetExceptEmpty(audioSourceValues)) {
        const willOverrideAudioSource =
            audioDup.length === 1 && audioDup[0] === "true";
        if (willOverrideAudioSource) {
            content += generateCase(audioDup, audioSource, `"playback"`);
            continue;
        }

        const mayOverrideAudioSource = audioDup.includes(`true`);
        if (mayOverrideAudioSource) {
            const expected = new Set([`"playback"`]);
            for (const source of audioSource) {
                switch (source) {
                    case "undefined":
                        // add default value
                        expected.add(`"output"`);
                        break;
                    default:
                        expected.add(source);
                        break;
                }
            }

            content += generateCase(
                audioDup,
                audioSource,
                Array.from(expected).join("|"),
            );
            continue;
        }

        const expected = new Set();
        for (const source of audioSource) {
            switch (source) {
                case "undefined":
                    // add default value
                    expected.add(`"output"`);
                    break;
                default:
                    expected.add(source);
                    break;
            }
        }

        content += generateCase(
            audioDup,
            audioSource,
            Array.from(expected).join("|"),
        );
    }

    content += `\n// #endregion\n`;
}

content = await format(content, { parser: "typescript" });

writeFileSync(new URL("./type-tests.spec.ts", import.meta.url), content);
