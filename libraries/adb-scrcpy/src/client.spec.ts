import { describe, it } from "node:test";

import type { Adb } from "@yume-chan/adb";
import { DefaultServerPath } from "@yume-chan/scrcpy";

import { AdbScrcpyOptions1_15 } from "./1_15/options.js";
import { AdbScrcpyOptions2_0 } from "./2_0/options.js";
import { AdbScrcpyOptions2_1 } from "./2_1/options.js";
import { AdbScrcpyOptions3_1 } from "./3_1.js";
import { AdbScrcpyClient } from "./client.js";
import type { AdbScrcpyVideoStream } from "./video.js";

const TypeOnlyTest = false;
declare const adb: Adb;

function expect(value: true): void {
    void value;
}

function equal<X>(): <Y>(
    value: Y,
) => (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false {
    return (() => {}) as never;
}

describe("AdbScrcpyClient", () => {
    describe("videoStream", () => {
        it("should have value in lower versions", async () => {
            if (TypeOnlyTest) {
                const client = await AdbScrcpyClient.start(
                    adb,
                    DefaultServerPath,
                    new AdbScrcpyOptions1_15({}),
                );
                expect(
                    equal<Promise<AdbScrcpyVideoStream>>()(client.videoStream),
                );
            }

            if (TypeOnlyTest) {
                const client = await AdbScrcpyClient.start(
                    adb,
                    DefaultServerPath,
                    new AdbScrcpyOptions2_0({}),
                );
                expect(
                    equal<Promise<AdbScrcpyVideoStream>>()(client.videoStream),
                );
            }
        });

        it("should have value when video: true", async () => {
            if (TypeOnlyTest) {
                const client = await AdbScrcpyClient.start(
                    adb,
                    DefaultServerPath,
                    new AdbScrcpyOptions2_1({ video: true }),
                );
                expect(
                    equal<Promise<AdbScrcpyVideoStream>>()(client.videoStream),
                );
            }

            if (TypeOnlyTest) {
                const client = await AdbScrcpyClient.start(
                    adb,
                    DefaultServerPath,
                    new AdbScrcpyOptions3_1({ video: true }),
                );
                expect(
                    equal<Promise<AdbScrcpyVideoStream>>()(client.videoStream),
                );
            }
        });

        it("should be undefined when video: false", async () => {
            if (TypeOnlyTest) {
                const client = await AdbScrcpyClient.start(
                    adb,
                    DefaultServerPath,
                    new AdbScrcpyOptions2_1({ video: false }),
                );
                expect(equal<undefined>()(client.videoStream));
            }

            if (TypeOnlyTest) {
                const client = await AdbScrcpyClient.start(
                    adb,
                    DefaultServerPath,
                    new AdbScrcpyOptions3_1({ video: false }),
                );
                expect(equal<undefined>()(client.videoStream));
            }
        });

        it("should be a union when video: undefined", async () => {
            if (TypeOnlyTest) {
                const client = await AdbScrcpyClient.start(
                    adb,
                    DefaultServerPath,
                    new AdbScrcpyOptions2_1({}),
                );
                expect(
                    equal<Promise<AdbScrcpyVideoStream> | undefined>()(
                        client.videoStream,
                    ),
                );
            }

            if (TypeOnlyTest) {
                const client = await AdbScrcpyClient.start(
                    adb,
                    DefaultServerPath,
                    new AdbScrcpyOptions3_1({}),
                );
                expect(
                    equal<Promise<AdbScrcpyVideoStream> | undefined>()(
                        client.videoStream,
                    ),
                );
            }
        });

        it("should be a union when video: boolean", async () => {
            if (TypeOnlyTest) {
                const client = await AdbScrcpyClient.start(
                    adb,
                    DefaultServerPath,
                    new AdbScrcpyOptions2_1({ video: true as boolean }),
                );
                expect(
                    equal<Promise<AdbScrcpyVideoStream> | undefined>()(
                        client.videoStream,
                    ),
                );
            }

            if (TypeOnlyTest) {
                const client = await AdbScrcpyClient.start(
                    adb,
                    DefaultServerPath,
                    new AdbScrcpyOptions3_1({ video: true as boolean }),
                );
                expect(
                    equal<Promise<AdbScrcpyVideoStream> | undefined>()(
                        client.videoStream,
                    ),
                );
            }
        });
    });
});
