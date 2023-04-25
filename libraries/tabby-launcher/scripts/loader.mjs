import fs from "node:fs";

fs.writeFileSync(
    new URL("../dist/main.js", import.meta.url),
    "export {};\n" +
        fs
            .readFileSync(new URL("../dist/main.js", import.meta.url), "utf8")
            .replaceAll(/__webpack_require__\.p \+ "(.+)"/g, (_, match) => {
                return `new URL("./${match}", import.meta.url).toString()`;
            })
            .replaceAll(/__webpack_require__/g, "__webpack_require_nested__")
            .replace(
                "var scriptUrl;",
                "var scriptUrl = import.meta.url.toString();"
            )
);
