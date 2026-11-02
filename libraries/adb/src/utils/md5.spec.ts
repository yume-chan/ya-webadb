import assert from "assert";
import { describe, it } from "node:test";

import { encodeUtf8 } from "@yume-chan/struct";

import { Md5, md5Digest } from "./md5.js";

describe("md5", () => {
    it("should digest empty string", () => {
        const expected = "d41d8cd98f00b204e9800998ecf8427e";
        const actual = md5Digest(encodeUtf8(""));
        assert.deepStrictEqual(
            Buffer.from(actual),
            Buffer.from(expected, "hex"),
        );
    });

    it("should digest 'abc'", () => {
        const expected = "900150983cd24fb0d6963f7d28e17f72";
        const actual = md5Digest(encodeUtf8("abc"));
        assert.deepStrictEqual(
            Buffer.from(actual),
            Buffer.from(expected, "hex"),
        );
    });

    it("should digest 'The quick brown fox jumps over the lazy dog'", () => {
        const expected = "9e107d9d372bb6826bd81d3542a419d6";
        const actual = md5Digest(
            encodeUtf8("The quick brown fox jumps over the lazy dog"),
        );
        assert.deepStrictEqual(
            Buffer.from(actual),
            Buffer.from(expected, "hex"),
        );
    });

    it("should digest 'c'\u00e8'", () => {
        const expected = "8ef7c2941d78fe89f31e614437c9db59";
        const actual = md5Digest(encodeUtf8("c'\u00e8"));
        assert.deepStrictEqual(
            Buffer.from(actual),
            Buffer.from(expected, "hex"),
        );
    });

    it("should digest 'THIS IS A MESSAGE'", () => {
        const expected = "78eebfd9d42958e3f31244f116ab7bbe";
        const md5 = new Md5();
        md5.update(encodeUtf8("THIS IS "));
        md5.update(encodeUtf8("A MESSAGE"));
        const actual = md5.digest();
        assert.deepStrictEqual(
            Buffer.from(actual),
            Buffer.from(expected, "hex"),
        );
    });

    it("should digest a long message", () => {
        const input = Buffer.from(
            "0100002903018d32e9c6dc423774c4c39a5a1b78f44cc2cab5f676d39" +
                "f703d29bfa27dfeb870000002002f01000200004603014c2c1e835d39" +
                "da71bc0857eb04c2b50fe90dbb2a8477fe7364598d6f0575999c20a6c" +
                "7248c5174da6d03ac711888f762fc4ed54f7254b32273690de849c843" +
                "073d002f000b0003d20003cf0003cc308203c8308202b0a0030201020" +
                "20100300d06092a864886f70d0101050500308186310b300906035504" +
                "0613025553311d301b060355040a13144469676974616c2042617a616" +
                "1722c20496e632e31443042060355040b133b4269746d756e6b206c6f" +
                "63616c686f73742d6f6e6c7920436572746966696361746573202d204" +
                "17574686f72697a6174696f6e20766961204254503112301006035504" +
                "0313096c6f63616c686f7374301e170d3130303231343137303931395" +
                "a170d3230303231333137303931395a308186310b3009060355040613" +
                "025553311d301b060355040a13144469676974616c2042617a6161722" +
                "c20496e632e31443042060355040b133b4269746d756e6b206c6f6361" +
                "6c686f73742d6f6e6c7920436572746966696361746573202d2041757" +
                "4686f72697a6174696f6e207669612042545031123010060355040313" +
                "096c6f63616c686f737430820122300d06092a864886f70d010101050" +
                "00382010f003082010a0282010100dc436f17d6909d8a9d6186ea218e" +
                "b5c86b848bae02219bd56a71203daf07e81bc19e7e98134136bcb0128" +
                "81864bf03b3774652ad5eab85dba411a5114ffeac09babce75f313143" +
                "45512cd87c91318b2e77433270a52185fc16f428c3ca412ad6e9484bc" +
                "2fb87abb4e8fb71bf0f619e31a42340b35967f06c24a741a31c979c0b" +
                "b8921a90a47025fbeb8adca576979e70a56830c61170c9647c18c0794" +
                "d68c0df38f3aac5fc3b530e016ea5659715339f3f3c209cdee9dbe794" +
                "b5af92530c5754c1d874b78974bfad994e0dfc582275e79feb522f6e4" +
                "bcc2b2945baedfb0dbdaebb605f9483ff0bea29ecd5f4d6f2769965d1" +
                "b3e04f8422716042680011ff676f0203010001a33f303d300c0603551" +
                "d130101ff04023000300e0603551d0f0101ff0404030204f0301d0603" +
                "551d250416301406082b0601050507030106082b06010505070302300" +
                "d06092a864886f70d010105050003820101009c4562be3f2d8d8e3880" +
                "85a697f2f106eaeff4992a43f198fe3dcf15c8229cf1043f061a38204" +
                "f73d86f4fb6348048cc5279ed719873aa10e3773d92b629c2c3fcce04" +
                "012c81ba3b4ec451e9644ec5191078402d845e05d02c7b4d974b45882" +
                "76e5037aba7ef26a8bddeb21e10698c82f425e767dc401adf722fa73a" +
                "b78cfa069bd69052d7ca6a75cc9225550e315d71c5f8764362ea4dbc6" +
                "ecb837a8471043c5a7f826a71af145a053090bd4bccca6a2c552841cd" +
                "b1908a8352f49283d2e641acdef667c7543af441a16f8294251e2ac37" +
                "6fa507b53ae418dd038cd20cef1e7bfbf5ae03a7c88d93d843abaabbd" +
                "c5f3431132f3e559d2dd414c3eda38a210b80e0000001000010201002" +
                "6a220b7be857402819b78d81080d01a682599bbd00902985cc64edf8e" +
                "520e4111eb0e1729a14ffa3498ca259cc9ad6fc78fa130d968ebdb78d" +
                "c0b950c0aa44355f13ba678419185d7e4608fe178ca6b2cef33e41937" +
                "78d1a70fe4d0dfcb110be4bbb4dbaa712177655728f914ab4c0f6c4ae" +
                "f79a46b3d996c82b2ebe9ed1748eb5cace7dc44fb67e73f452a047f2e" +
                "d199b3d50d5db960acf03244dc8efa4fc129faf8b65f9e52e62b55447" +
                "22bd17d2358e817a777618a4265a3db277fc04851a82a91fe6cdcb812" +
                "7f156e0b4a5d1f54ce2742eb70c895f5f8b85f5febe69bc73e891f928" +
                "0826860a0c2ef94c7935e6215c3c4cd6b0e43e80cca396d913d36be",
            "hex",
        );
        const expected = "d15a2da0e92c3da55dc573f885b6e653";

        const md5 = new Md5();
        md5.update(input);
        const actual = md5.digest();
        assert.deepStrictEqual(
            Buffer.from(actual),
            Buffer.from(expected, "hex"),
        );
    });
    it("should digest multiple long messages", () => {
        // Note: might be too slow on old browsers
        // done multiple times to check hot loop optimizations
        for (let loop = 0; loop < 3; loop += 1) {
            const md5 = new Md5();
            for (let i = 0; i < 10000; i += 1) {
                md5.update(encodeUtf8("abc"));
            }
            assert.deepStrictEqual(
                Buffer.from(md5.digest()),
                Buffer.from("b3e98306e7367f93cd7cb870af64f7b7", "hex"),
            );
        }
    });
});
