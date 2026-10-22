'use strict';
// Security floors published by Node.js on 2026-10-21.
const minimum = {"22": [23, 4], "24": [22, 1], "26": [12, 1]};
const [major, minor, patch] = process.versions.node.split('.').map(Number);
const floor = minimum[major];
if (!Number.isInteger(minor) || !Number.isInteger(patch) || !floor || minor < floor[0] || (minor === floor[0] && patch < floor[1])) {
  console.error(`Node.js ${process.versions.node} is below this repository's security baseline. Use the version in .node-version before installing dependencies.`);
  process.exit(1);
}
console.log(`Node.js ${process.versions.node}: security baseline satisfied`);
