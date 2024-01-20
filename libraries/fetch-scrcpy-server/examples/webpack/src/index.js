import { BIN, VERSION } from "@yume-chan/fetch-scrcpy-server";

const output = document.getElementById("output");
output.textContent += VERSION + "\n";
fetch(BIN)
    .then((res) => res.arrayBuffer())
    .then((buffer) => {
        output.textContent += "length: " + buffer.byteLength + " bytes\n";
    });
