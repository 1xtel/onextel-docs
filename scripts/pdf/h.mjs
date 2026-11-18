// hastscript with `cond && h(...)` support: false and true children are dropped.
import { h as hastscript } from "hastscript";

const drop = (v) => (v === false || v === true ? null : Array.isArray(v) ? v.map(drop) : v);
export const h = (...args) => hastscript(...args.map(drop));
