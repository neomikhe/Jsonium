import { readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'vite';

const FIXTURE = resolve(process.argv[2] ?? 'bench/fixtures/large.json');
const BUILD_DIR = resolve('bench/.build');
const RESULTS_DIR = resolve('bench/results');
const BYTES_PER_MB = 1024 * 1024;

async function loadCore() {
  await build({
    configFile: false,
    logLevel: 'error',
    build: {
      outDir: BUILD_DIR,
      emptyOutDir: true,
      minify: false,
      lib: { entry: resolve('src/core/stats.ts'), formats: ['es'], fileName: 'core' },
    },
  });
  return import(`file://${BUILD_DIR}/core.js`);
}

function measure(label, action) {
  const startedAt = performance.now();
  const value = action();
  const elapsedMs = performance.now() - startedAt;
  console.log(`  ${label.padEnd(18)} ${elapsedMs.toFixed(0).padStart(7)} ms`);
  return { value, elapsedMs };
}

function heapMb() {
  return process.memoryUsage().heapUsed / BYTES_PER_MB;
}

const { computeStats } = await loadCore();
const sizeMb = statSync(FIXTURE).size / BYTES_PER_MB;

console.log(`Fixture: ${FIXTURE}`);
console.log(`Tamano:  ${sizeMb.toFixed(1)} MB`);
console.log(`Node:    ${process.version}\n`);

const read = measure('leer archivo', () => readFileSync(FIXTURE, 'utf8'));
const heapAfterRead = heapMb();
const parsed = measure('JSON.parse', () => JSON.parse(read.value));
const heapAfterParse = heapMb();
const stats = measure('computeStats', () => computeStats(parsed.value));

console.log(`\n  nodos            ${stats.value.nodes.toLocaleString('en-US').padStart(11)}`);
console.log(`  profundidad      ${String(stats.value.maxDepth).padStart(11)}`);
console.log(`  heap tras parse  ${heapAfterParse.toFixed(0).padStart(8)} MB`);

const report = {
  recordedAt: new Date().toISOString(),
  node: process.version,
  platform: `${process.platform} ${process.arch}`,
  fixtureMb: Number(sizeMb.toFixed(1)),
  readMs: Math.round(read.elapsedMs),
  parseMs: Math.round(parsed.elapsedMs),
  statsMs: Math.round(stats.elapsedMs),
  nodes: stats.value.nodes,
  maxDepth: stats.value.maxDepth,
  heapAfterReadMb: Math.round(heapAfterRead),
  heapAfterParseMb: Math.round(heapAfterParse),
};

await mkdir(RESULTS_DIR, { recursive: true });
const target = resolve(RESULTS_DIR, `${report.recordedAt.replaceAll(':', '-')}.json`);
await writeFile(target, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nInforme: ${target}`);
