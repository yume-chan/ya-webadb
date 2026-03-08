import * as Comlink from "comlink";

import { DecoderRenderer } from "./core.js";

Comlink.expose(DecoderRenderer);

postMessage("ready");
