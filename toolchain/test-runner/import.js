import { register } from "node:module";
import { installSourceMapSupport } from "@swc-node/sourcemap-support";

installSourceMapSupport();

register("@swc-node/register/esm", import.meta.url);
