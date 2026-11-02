import * as Comlink from "comlink";

import * as core from "./core.js";

Comlink.expose(core);

postMessage("ready");
