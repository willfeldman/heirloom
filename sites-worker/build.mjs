import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist/server/index.js");
await mkdir(dirname(output), { recursive: true });
await copyFile(resolve(import.meta.dirname, "worker.mjs"), output);
console.log(`wrote ${output}`);
