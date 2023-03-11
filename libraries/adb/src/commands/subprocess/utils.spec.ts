import { describe, expect, it } from "@jest/globals";

import { escapeArg } from "./utils.js";

describe("escapeArg", () => {
    it("should escape single quotes", () => {
        // https://android.googlesource.com/platform/packages/modules/adb/+/72c82a8d8ea0648ecea9dd47e0f4176bad792cfa/adb_utils_test.cpp#84
        expect(String.raw`''`).toBe(escapeArg(""));

        expect(String.raw`'abc'`).toBe(escapeArg("abc"));

        function wrap(x: string) {
            return "'" + x + "'";
        }

        const q = String.raw`'\''`;
        expect(wrap(q)).toBe(escapeArg("'"));
        expect(wrap(q + q)).toBe(escapeArg("''"));
        expect(wrap(q + "abc" + q)).toBe(escapeArg("'abc'"));
        expect(wrap(q + "abc")).toBe(escapeArg("'abc"));
        expect(wrap("abc" + q)).toBe(escapeArg("abc'"));
        expect(wrap("abc" + q + "def")).toBe(escapeArg("abc'def"));
        expect(wrap("a" + q + "b" + q + "c")).toBe(escapeArg("a'b'c"));
        expect(wrap("a" + q + "bcde" + q + "f")).toBe(escapeArg("a'bcde'f"));

        expect(String.raw`' abc'`).toBe(escapeArg(" abc"));
        expect(String.raw`'"abc'`).toBe(escapeArg('"abc'));
        expect(String.raw`'\abc'`).toBe(escapeArg("\\abc"));
        expect(String.raw`'(abc'`).toBe(escapeArg("(abc"));
        expect(String.raw`')abc'`).toBe(escapeArg(")abc"));

        expect(String.raw`'abc abc'`).toBe(escapeArg("abc abc"));
        expect(String.raw`'abc"abc'`).toBe(escapeArg('abc"abc'));
        expect(String.raw`'abc\abc'`).toBe(escapeArg("abc\\abc"));
        expect(String.raw`'abc(abc'`).toBe(escapeArg("abc(abc"));
        expect(String.raw`'abc)abc'`).toBe(escapeArg("abc)abc"));

        expect(String.raw`'abc '`).toBe(escapeArg("abc "));
        expect(String.raw`'abc"'`).toBe(escapeArg('abc"'));
        expect(String.raw`'abc\'`).toBe(escapeArg("abc\\"));
        expect(String.raw`'abc('`).toBe(escapeArg("abc("));
        expect(String.raw`'abc)'`).toBe(escapeArg("abc)"));
    });
});
