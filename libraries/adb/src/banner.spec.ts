import { describe, expect, it } from "@jest/globals";

import { AdbBanner } from "./banner.js";

describe("AdbBanner", () => {
    it("should parse old banner", () => {
        const banner = AdbBanner.parse(
            "device::ro.product.name=NovaPro;ro.product.model=NovaPro;ro.product.device=NovaPro;\0",
        );
        expect(banner).toHaveProperty("product", "NovaPro");
        expect(banner).toHaveProperty("model", "NovaPro");
        expect(banner).toHaveProperty("device", "NovaPro");
        expect(banner).toHaveProperty("features", []);
    });

    it("should parse new banner", () => {
        const banner = AdbBanner.parse(
            "device::ro.product.name=mblu_10_CN;ro.product.model=mblu10;ro.product.device=mblu10;features=sendrecv_v2_brotli,remount_shell,sendrecv_v2,abb_exec,fixed_push_mkdir,fixed_push_symlink_timestamp,abb,shell_v2,cmd,ls_v2,apex,stat_v2",
        );
        expect(banner).toHaveProperty("product", "mblu_10_CN");
        expect(banner).toHaveProperty("model", "mblu10");
        expect(banner).toHaveProperty("device", "mblu10");
        expect(banner).toHaveProperty("features", [
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
