import * as assert from "node:assert";
import { describe, it } from "node:test";

import { AdbBanner } from "./banner.js";

describe("AdbBanner", () => {
    it("should parse old banner", () => {
        const banner = AdbBanner.parse(
            "device::ro.product.name=NovaPro;ro.product.model=NovaPro;ro.product.device=NovaPro;\0",
        );
        assert.strictEqual(banner.product, "NovaPro");
        assert.strictEqual(banner.model, "NovaPro");
        assert.strictEqual(banner.device, "NovaPro");
        assert.deepStrictEqual(banner.features, []);
    });

    it("should parse new banner", () => {
        const banner = AdbBanner.parse(
            "device::ro.product.name=mblu_10_CN;ro.product.model=mblu10;ro.product.device=mblu10;features=sendrecv_v2_brotli,remount_shell,sendrecv_v2,abb_exec,fixed_push_mkdir,fixed_push_symlink_timestamp,abb,shell_v2,cmd,ls_v2,apex,stat_v2",
        );
        assert.strictEqual(banner.product, "mblu_10_CN");
        assert.strictEqual(banner.model, "mblu10");
        assert.strictEqual(banner.device, "mblu10");
        assert.deepStrictEqual(banner.features, [
            "sendrecv_v2_brotli",
            "remount_shell",
            "sendrecv_v2",
            "abb_exec",
            "fixed_push_mkdir",
            "fixed_push_symlink_timestamp",
            "abb",
            "shell_v2",
            "cmd",
            "ls_v2",
            "apex",
            "stat_v2",
        ]);
    });
});
