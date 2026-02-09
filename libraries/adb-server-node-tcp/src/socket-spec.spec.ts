import * as assert from "node:assert";
import { describe, it } from "node:test";

import { parseTcpSocketSpec } from "./socket-spec.js";

// https://cs.android.com/android/platform/superproject/main/+/main:packages/modules/adb/socket_spec_test.cpp;drc=3cbf75aad9bff42f4d46fa744cf2a3547a63a1cf
describe("parseTcpSocketSpec", () => {
    it("just port success", () => {
        assert.deepStrictEqual(parseTcpSocketSpec("5037"), { port: 5037 });
    });

    it("bad ports failure", () => {
        assert.throws(() => parseTcpSocketSpec(""));
        assert.throws(() => parseTcpSocketSpec("-1"));
        assert.throws(() => parseTcpSocketSpec("65536"));
    });

    it("host and port success", () => {
        assert.deepStrictEqual(parseTcpSocketSpec("localhost:1234"), {
            host: "localhost",
            port: 1234,
        });
    });

    it("host no port success", () => {
        assert.deepStrictEqual(parseTcpSocketSpec("localhost"), {
            host: "localhost",
        });
    });

    it("host ipv4 no port success", () => {
        assert.deepStrictEqual(parseTcpSocketSpec("127.0.0.1"), {
            host: "127.0.0.1",
        });
    });

    it("host bad ports failure", () => {
        assert.throws(() => parseTcpSocketSpec("localhost:"));
        assert.throws(() => parseTcpSocketSpec("localhost:-1"));
        assert.throws(() => parseTcpSocketSpec("localhost:65536"));
    });

    it("host ipv4 bad ports failure", () => {
        assert.throws(() => parseTcpSocketSpec("127.0.0.1:"));
        assert.throws(() => parseTcpSocketSpec("127.0.0.1:-1"));
        assert.throws(() => parseTcpSocketSpec("127.0.0.1:65536"));
    });

    it("host ipv6 bad ports failure", () => {
        assert.throws(() =>
            parseTcpSocketSpec("2601:644:8e80:620:c63:50c9:8a91:8efa::"),
        );
        assert.throws(() =>
            parseTcpSocketSpec("2601:644:8e80:620:c63:50c9:8a91:8efa::-1"),
        );
        assert.throws(() =>
            parseTcpSocketSpec("2601:644:8e80:620:c63:50c9:8a91:8efa::65536"),
        );
    });

    it("ipv6 and port success", () => {
        assert.deepStrictEqual(parseTcpSocketSpec("[::1]:1234"), {
            host: "::1",
            port: 1234,
        });
        assert.deepStrictEqual(
            parseTcpSocketSpec("[2601:644:8e80:620::fbbc]:2345"),
            {
                host: "2601:644:8e80:620::fbbc",
                port: 2345,
            },
        );
    });

    it("ipv6 no port success", () => {
        assert.deepStrictEqual(parseTcpSocketSpec("::1"), {
            host: "::1",
        });
        assert.deepStrictEqual(parseTcpSocketSpec("2601:644:8e80:620::fbbc"), {
            host: "2601:644:8e80:620::fbbc",
        });
        assert.deepStrictEqual(
            parseTcpSocketSpec("2601:644:8e80:620:c63:50c9:8a91:8efa"),
            {
                host: "2601:644:8e80:620:c63:50c9:8a91:8efa",
            },
        );
        assert.deepStrictEqual(
            parseTcpSocketSpec("2601:644:8e80:620:2d0e:b944:5288:97df"),
            {
                host: "2601:644:8e80:620:2d0e:b944:5288:97df",
            },
        );
    });

    it("ipv6 bad ports failure", () => {
        assert.throws(() => parseTcpSocketSpec("[::1]:"));
        assert.throws(() => parseTcpSocketSpec("[::1]:-1"));
        assert.throws(() => parseTcpSocketSpec("[::1]:65536"));
        assert.deepStrictEqual(
            parseTcpSocketSpec("2601:644:8e80:620:2d0e:b944:5288:97df"),
            { host: "2601:644:8e80:620:2d0e:b944:5288:97df" },
        );
        assert.throws(() =>
            parseTcpSocketSpec("2601:644:8e80:620:2d0e:b944:5288:97df:-1"),
        );
        assert.throws(() =>
            parseTcpSocketSpec("2601:644:8e80:620:2d0e:b944:5288:97df:65536"),
        );
    });
});
