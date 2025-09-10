import { writeFileSync } from "node:fs";

async function generateTest(packageName, filename) {
    const exports = await import(packageName);
    const names = Object.keys(exports);

    writeFileSync(
        filename,
        `
import { ${names.join(", ")} } from "${packageName}";

export default () => {
    console.log(${names.join(", ")})
}
`,
        "utf8",
    );
}

await Promise.all([
    generateTest("@yume-chan/scrcpy", "./src/scrcpy.js"),
    generateTest("@yume-chan/adb", "./src/adb.js"),
]);
