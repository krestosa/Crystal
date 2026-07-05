import "./module.ts";
import { sampleValue } from "./module.ts";
const lazyModule = import("./module.ts");
const legacyModule = require("./legacy.js");
console.log(sampleValue, lazyModule, legacyModule);
