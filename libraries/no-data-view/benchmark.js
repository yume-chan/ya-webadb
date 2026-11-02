/// <reference types="node" />

import { once } from "events";
import { createWriteStream } from "fs";
import { Bench } from "tinybench";

import {
    getInt16LittleEndian,
    getInt32LittleEndian,
    getInt64LittleEndian,
    getUint16,
    getUint16BigEndian,
    getUint16LittleEndian,
    getUint32LittleEndian,
    getUint64BigEndian,
    getUint64LittleEndian,
} from "./esm/index.js";

console.log(
    "Adjust priority for process",
    process.pid,
    ", then press Enter to start...",
);
await once(process.stdin, "data");
console.log("Starting benchmark");

const data = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
const buffer = data.buffer;
const dataView = new DataView(data.buffer);

const output = createWriteStream("benchmark.md");

/**
 *
 * @param {string} name
 * @param {Bench} bench
 */
function print(name, bench) {
    console.log();
    console.log(name);
    console.table(bench.table());

    output.write("## " + name + "\n\n");
    output.write(
        "| " +
            ["Name", "Ops/s", "Avg Time", "Compare"].join(" | ") +
            " |\n" +
            "|---|---|---|---|\n",
    );
    let firstResultHz;
    for (const task of bench.tasks) {
        const result = task.result;
        if (!result) {
            return;
        }
        let compare = 1;
        if (firstResultHz) {
            compare = result.hz / firstResultHz;
        } else {
            firstResultHz = result.hz;
        }
        output.write(
            "| " +
                [
                    task.name,
                    (result.hz | 0).toLocaleString("en-US"),
                    (result.mean * 1_000_000).toLocaleString("en-US") + " ns",
                    (compare * 100).toFixed(2) + "%",
                ].join(" | ") +
                " |\n",
        );
    }
    output.write("\n");
}

const only = process.argv[2];

/**
 *
 * @param {string} name
 * @param {(bench:Bench)=>void} callback
 * @returns
 */
async function runBenchmark(name, callback) {
    if (only && only !== name) {
        return;
    }

    const bench = new Bench();
    callback(bench);

    await bench.warmup();
    await bench.run();

    print(name, bench);
}

await runBenchmark("getUint16LittleEndian", (bench) => {
    bench
        .add("getUint16LittleEndian", () => {
            getUint16LittleEndian(data, 0);
        })
        .add("cached DataView", () => {
            dataView.getUint16(0, true);
        })
        .add("new DataView", () => {
            new DataView(buffer).getUint16(0, true);
        });
});

await runBenchmark("getUint16BigEndian", (bench) => {
    bench
        .add("getUint16BigEndian", () => {
            getUint16BigEndian(data, 0);
        })
        .add("cached DataView", () => {
            dataView.getUint16(0, true);
        })
        .add("new DataView", () => {
            new DataView(buffer).getUint16(0, true);
        });
});

await runBenchmark("getUint16", (bench) => {
    let littleEndian = true;

    bench
        .add(
            "getUint16",
            () => {
                getUint16(data, 0, littleEndian);
            },
            {
                beforeEach: () => {
                    littleEndian = Math.random() > 0.5;
                },
            },
        )
        .add(
            "cached DataView",
            () => {
                dataView.getUint16(0, true);
            },
            {
                beforeEach: () => {
                    littleEndian = Math.random() > 0.5;
                },
            },
        )
        .add(
            "new DataView",
            () => {
                new DataView(buffer).getUint16(0, true);
            },
            {
                beforeEach: () => {
                    littleEndian = Math.random() > 0.5;
                },
            },
        );
});

await runBenchmark("getInt16LittleEndian", (bench) => {
    bench
        .add("getInt16LittleEndian", () => {
            getInt16LittleEndian(data, 0);
        })
        .add("cached DataView", () => {
            dataView.getInt16(0, true);
        })
        .add("new DataView", () => {
            new DataView(buffer).getInt16(0, true);
        });
});

await runBenchmark("getUint32LittleEndian", (bench) => {
    bench
        .add("getUint32LittleEndian", () => {
            getUint32LittleEndian(data, 0);
        })
        .add("cached DataView", () => {
            dataView.getUint32(0, true);
        })
        .add("new DataView", () => {
            new DataView(buffer).getUint32(0, true);
        });
});

await runBenchmark("getInt32LittleEndian", (bench) => {
    bench
        .add("getInt32LittleEndian", () => {
            getInt32LittleEndian(data, 0);
        })
        .add("cached DataView", () => {
            dataView.getInt32(0, true);
        })
        .add("new DataView", () => {
            new DataView(buffer).getInt32(0, true);
        });
});

await runBenchmark("getUint64LittleEndian", (bench) => {
    bench
        .add("getUint64LittleEndian", () => {
            getUint64LittleEndian(data, 0);
        })
        .add("cached DataView", () => {
            dataView.getBigUint64(0, true);
        })
        .add("new DataView", () => {
            new DataView(buffer).getBigUint64(0, true);
        });
});

await runBenchmark("getUint64BigEndian", (bench) => {
    bench
        .add("getUint64BigEndian", () => {
            getUint64BigEndian(data, 0);
        })
        .add("cached DataView", () => {
            dataView.getBigUint64(0, true);
        })
        .add("new DataView", () => {
            new DataView(buffer).getBigUint64(0, true);
        });
});

await runBenchmark("getInt64LittleEndian", (bench) => {
    bench
        .add("getInt64LittleEndian", () => {
            getInt64LittleEndian(data, 0);
        })
        .add("cached DataView", () => {
            dataView.getBigInt64(0, true);
        })
        .add("new DataView", () => {
            new DataView(buffer).getBigInt64(0, true);
        });
});

output.close(() => {
    process.exit(0);
});
