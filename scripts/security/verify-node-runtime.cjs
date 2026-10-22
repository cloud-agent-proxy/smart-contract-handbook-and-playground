// Run explicitly with node --test; avoid collection by Vitest/Jest.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.resolve(__dirname, '../..');
const cases = [
  ['20.20.2', false], ['22.23.3', false], ['22.23.4', true],
  ['24.15.0', false], ['24.22.0', false], ['24.22.1', true],
  ['24.23.0', true], ['25.0.0', false], ['26.12.0', false],
  ['26.12.1', true], ['24.22.1-rc.1', false],
  ['24.22', false], ['24.22.NaN', false], ['999.0.0', false],
];
function accepts(source, version) {
  try {
    vm.runInNewContext(source, {
      process: { versions: { node: version }, exit(code) { throw { exitCode: code }; } },
      console: { log() {}, error() {} },
    }, { timeout: 1000 });
    return true;
  } catch (error) {
    assert.equal(error.exitCode, 1, 'guard must reject with a controlled exit, not a JavaScript exception');
    return false;
  }
}
function manifests(directory) {
  const ignored = new Set(['.git', 'node_modules', 'lib', 'vendor', '.tmp', '.claude', '.venv', 'dist', 'build', '.next']);
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (ignored.has(entry.name) || entry.isSymbolicLink()) return [];
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return manifests(target);
    return entry.name === 'package.json' ? [target] : [];
  });
}
test('security checker rejects old, unsupported and prerelease runtimes at advisory boundaries', () => {
  const source = fs.readFileSync(path.join(__dirname, 'check-node-runtime.cjs'), 'utf8');
  for (const [version, expected] of cases) assert.equal(accepts(source, version), expected, version);
});
test('every first-party install guard enforces the same advisory boundaries', () => {
  for (const file of manifests(root)) {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    const install = pkg.scripts?.preinstall || '';
    if (!install.includes('Unsupported or unpatched Node.js')) continue;
    const match = install.match(/^node -e "(.*?)"(?: &&|$)/);
    assert.ok(match, `${file}: expected standalone Node guard before existing install hooks`);
    for (const [version, expected] of cases) assert.equal(accepts(match[1], version), expected, `${file}: ${version}`);
  }
});
