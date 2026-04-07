import * as assert from "node:assert";
import { describe, it } from "node:test";

import { escapeArg } from "./utils.js";

describe("escapeArg", () => {
    it("should escape single quotes", () => {
        // https://android.googlesource.com/platform/packages/modules/adb/+/72c82a8d8ea0648ecea9dd47e0f4176bad792cfa/adb_utils_test.cpp#84
        assert.equal(escapeArg(""), String.raw`''`);
        assert.equal(escapeArg("abc"), String.raw`'abc'`);

        function wrap(x: string) {
            return "'" + x + "'";
        }

        const q = String.raw`'\''`;
        assert.equal(escapeArg("'"), wrap(q));
        assert.equal(escapeArg("''"), wrap(q + q));
        assert.equal(escapeArg("'abc'"), wrap(q + "abc" + q));
        assert.equal(escapeArg("'abc"), wrap(q + "abc"));
        assert.equal(escapeArg("abc'"), wrap("abc" + q));
        assert.equal(escapeArg("abc'def"), wrap("abc" + q + "def"));
        assert.equal(escapeArg("a'b'c"), wrap("a" + q + "b" + q + "c"));
        assert.equal(escapeArg("a'bcde'f"), wrap("a" + q + "bcde" + q + "f"));

        assert.equal(escapeArg(" abc"), String.raw`' abc'`);
        assert.equal(escapeArg('"abc'), String.raw`'"abc'`);
        assert.equal(escapeArg("\\abc"), String.raw`'\abc'`);
        assert.equal(escapeArg("(abc"), String.raw`'(abc'`);
        assert.equal(escapeArg(")abc"), String.raw`')abc'`);

        assert.equal(escapeArg("abc abc"), String.raw`'abc abc'`);
        assert.equal(escapeArg('abc"abc'), String.raw`'abc"abc'`);
        assert.equal(escapeArg("abc\\abc"), String.raw`'abc\abc'`);
        assert.equal(escapeArg("abc(abc"), String.raw`'abc(abc'`);
        assert.equal(escapeArg("abc)abc"), String.raw`'abc)abc'`);

        assert.equal(escapeArg("abc "), String.raw`'abc '`);
        assert.equal(escapeArg('abc"'), String.raw`'abc"'`);
        assert.equal(escapeArg("abc\\"), String.raw`'abc\'`);
        assert.equal(escapeArg("abc("), String.raw`'abc('`);
        assert.equal(escapeArg("abc)"), String.raw`'abc)'`);
    });
});
