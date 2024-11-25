import type { PrevImpl } from "./prev.js";

export interface Init extends PrevImpl.Init {
    clipboardAutosync?: boolean;
}
