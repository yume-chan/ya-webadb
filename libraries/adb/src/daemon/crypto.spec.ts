import * as assert from "node:assert";
import { describe, it } from "node:test";

import { modInverse } from "./crypto.js";

describe("modInverse", () => {
    it("should return correct value", () => {
        // https://github.com/openssl/openssl/blob/98161274636dca12e3bfafab7d2d2ac28f4d7c30/test/bntest.c#L3176
        assert.strictEqual(modInverse(5193817943, 3259122431), 2609653924);

        // https://cs.android.com/android/platform/superproject/main/+/main:external/cronet/third_party/boringssl/src/crypto/fipsmodule/bn/test/mod_inv_tests.txt
        assert.strictEqual(modInverse(0, 1), NaN);
        assert.strictEqual(modInverse(1, 1), NaN);
        assert.strictEqual(modInverse(2, 1), NaN);
        assert.strictEqual(modInverse(3, 1), NaN);
        assert.strictEqual(modInverse(0x54, 0xe3), 0x64);
        assert.strictEqual(modInverse(0x2b, 0x30), 0x13);
        assert.strictEqual(modInverse(0x30, 0x37), 0x2f);
        assert.strictEqual(modInverse(0x13, 0x4b), 0x4);
        assert.strictEqual(modInverse(0xcd4, 0x6a21), 0x1c47);
        assert.strictEqual(modInverse(0x8e7, 0x49c0), 0x2b97);
        assert.strictEqual(modInverse(0xfcb, 0x3092), 0x29b9);
        assert.strictEqual(modInverse(0x14bf, 0x41ae), 0xa83);
        assert.strictEqual(modInverse(0x11b5d53e, 0x322e92a1), 0x18f15fe1);
        assert.strictEqual(modInverse(0x8af6df6, 0x33d45eb7), 0x32f9453b);
        assert.strictEqual(modInverse(0xc5f89dd5, 0xfc09c17c), 0xd696369);
        assert.strictEqual(modInverse(0x60c2526, 0x74200493), 0x622839d8);
    });
});
