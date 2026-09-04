#!/usr/bin/env node
// Wrapper so celld can invoke esbuild (a native binary) through node, plus
// alias bare node-core requires (from CJS deps) to local shims.
const { spawnSync } = require("child_process");
const BIN = "/Users/loong/Documents/openworker/cloudflare-os/node_modules/.pnpm/esbuild@0.28.1/node_modules/esbuild/bin/esbuild";
const SHIMS = "/Users/loong/Documents/openworker/cloudflare-os/packages/workshop-backend/celld-shims";
const aliases = [
  `--alias:buffer=${SHIMS}/buffer.ts`,
  `--alias:string_decoder=${SHIMS}/string_decoder.ts`,
  `--alias:inherits=${SHIMS}/inherits.cjs`,
  `--alias:util=${SHIMS}/util.ts`,
  `--alias:events=${SHIMS}/events.ts`,
  `--alias:process=${SHIMS}/process.ts`,
];
const r = spawnSync(BIN, [...process.argv.slice(2), ...aliases], { stdio: "inherit" });
process.exit(r.status ?? 1);
