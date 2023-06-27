import { defineConfig } from "vite";

export default defineConfig({
    // This example installs the package as symlink
    // so this is required to allow vite to access the package
    server: {
        fs: {
            allow: ["../.."],
        },
    },
});
