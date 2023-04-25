import { Inflate } from "pako/dist/pako_inflate";
import { Transform } from "stream";

class NodeInflate extends Transform {
    constructor() {
        super({ autoDestroy: true });
        this.inflate = new Inflate();
        this.inflate.onData = (chunk) => {
            this.push(chunk);
        };
        this.inflate.onEnd = () => {
            this.emit("end");
        };
    }

    _transform(chunk, encoding, callback) {
        this.inflate.push(chunk, false);
        callback();
    }

    _flush(callback) {
        this.inflate.push([], true);
        callback();
    }
}

export function createGunzip() {
    return new NodeInflate();
}

export function createInflate() {
    return new NodeInflate();
}

export function createBrotliDecompress() {
    throw new Error(
        "Not supported. Modify headers['Accept-Encoding'] to exclude 'br'"
    );
}
