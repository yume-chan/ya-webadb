import * as Format from "./format-ns.js";

type Format = (typeof Format)[keyof typeof Format];

export { Format };
