import fs from "node:fs";

const baseUrl = (process.env.BASE_PATH ?? "") + "/";

fs.writeFileSync(
    new URL("../public/manifest.json", import.meta.url),
    JSON.stringify(
        {
            name: "Tango",
            short_name: "Tango",
            categories: ["utilities", "developer"],
            description: "ADB in your browser",
            scope: baseUrl,
            start_url: baseUrl,
            background_color: "#ffffff",
            display: "standalone",
            icons: [
                {
                    src: "favicon-256.png",
                    type: "image/png",
                    sizes: "256x256",
                },
            ],
        },
        undefined,
        4
    ),
    "utf8"
);

fs.writeFileSync(
    new URL(
        "../node_modules/tabby-web-container/dist/preload.mjs",
        import.meta.url
    ),
    "export {};\n" +
        fs
            .readFileSync(
                new URL(
                    "../node_modules/tabby-web-container/dist/preload.js",
                    import.meta.url
                ),
                "utf8"
            )
            .replaceAll(/__webpack_require__\.p \+ "(.+)"/g, (_, match) => {
                return `new URL("./${match}", import.meta.url).toString()`;
            })
            .replaceAll(/__webpack_require__/g, "__webpack_require_nested__")
            .replace(
                "var scriptUrl;",
                "var scriptUrl = import.meta.url.toString();"
            )
);
