import { BIN, VERSION } from "@yume-chan/fetch-scrcpy-server";
import fs from "fs/promises";

console.log(VERSION);
fs.readFile(BIN).then(console.log);
