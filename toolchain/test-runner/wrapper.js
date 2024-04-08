import { spawn } from "child_process";
import { resolve } from "path";
import { fileURLToPath } from "url";

const child = spawn(
    process.execPath,
    [
        "--experimental-test-coverage",
        "--import",
        import.meta.resolve("./import.js", import.meta.url),
        fileURLToPath(import.meta.resolve("./test.js", import.meta.url)),
    ],
    {
        stdio: "inherit",
        env: {
            SWC_NODE_PROJECT: resolve(process.cwd(), "tsconfig.test.json"),
        },
    },
);

child.on("exit", (code) => {
    process.exit(code);
});
