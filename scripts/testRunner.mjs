import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const testsDir = path.resolve('tests');
const testFiles = fs.readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.js'))
  .sort();

console.log(`\n==================================================`);
console.log(`🧪 ALIBI FORENSIC PLATFORM — TEST RUNNER 2026`);
console.log(`==================================================\n`);

let totalPassed = 0;
let totalFailed = 0;
const t0 = Date.now();

for (const file of testFiles) {
  const relPath = path.join('tests', file);
  process.stdout.write(`▶ ${file.padEnd(38)} `);
  try {
    // Node 22.14 cannot import .ts from tests without stripping types.
    // GitHub Actions Node 22.x is the same gate as npm test.
    const out = execSync(
      `node --import ./scripts/registerNpmSpecifierLoader.mjs --experimental-strip-types --test "${relPath}"`,
      {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    const match = out.match(/✔/g);
    const count = match ? match.length : 1;
    totalPassed += count;
    console.log(`✔ PASS (${count} tests)`);
  } catch (err) {
    totalFailed += 1;
    console.log(`✖ FAIL`);
    console.error(err.stdout || err.stderr || err.message);
  }
}

const duration = ((Date.now() - t0) / 1000).toFixed(2);
console.log(`\n==================================================`);
console.log(`📊 SÚHRN TESTOV: ${totalPassed} ÚSPEŠNÝCH | ${totalFailed} ZLYHANÝCH (${duration}s)`);
console.log(`==================================================\n`);

if (totalFailed > 0) {
  process.exit(1);
}
