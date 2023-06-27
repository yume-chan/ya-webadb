import { BIN, VERSION } from "@yume-chan/fetch-scrcpy-server";

console.log(VERSION);
fetch(BIN)
    .then((res) => res.arrayBuffer())
    .then(console.log);
