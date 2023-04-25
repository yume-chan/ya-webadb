export const env = {};
export const argv = ["tabby"];
export const platform =
    navigator.platform === "MacIntel"
        ? "darwin"
        : navigator.platform === "Win32"
        ? "win32"
        : "linux";
export const on = () => null;
export const stdout = {};
export const stderr = {};
export const resourcesPath = "resources";
export const version = "14.0.0";
export const versions = {
    modules: 0,
};
export const nextTick = (f, ...args) => setTimeout(() => f(...args));
export const cwd = () => "/";
