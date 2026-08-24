import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const TARGET_MB = Number(process.argv[2] ?? 100);
const OUTPUT = resolve(process.argv[3] ?? 'bench/fixtures/large.json');
const BYTES_PER_MB = 1024 * 1024;
const SEED = 20260817;
const CITIES = ['Madrid', 'Lisboa', 'Oporto', 'Sevilla', 'Bilbao', 'Valencia', 'Vigo'];
const TAGS = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'];

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(SEED);

function pick(values) {
  return values[Math.floor(random() * values.length)];
}

function buildRecord(id) {
  return {
    id,
    uuid: `${id.toString(16).padStart(8, '0')}-4f2a-11ee-be56-0242ac120002`,
    name: `user_${id.toString(36)}`,
    email: `user${id}@example.invalid`,
    active: random() > 0.3,
    score: Math.round(random() * 100000) / 100,
    tags: [pick(TAGS), pick(TAGS)],
    address: {
      street: `Calle ${Math.floor(random() * 300)}`,
      city: pick(CITIES),
      zip: String(10000 + Math.floor(random() * 89999)),
      geo: { lat: Number((random() * 180 - 90).toFixed(6)), lng: Number((random() * 360 - 180).toFixed(6)) },
    },
    meta: {
      createdAt: new Date(Date.UTC(2024, id % 12, (id % 27) + 1)).toISOString(),
      version: (id % 9) + 1,
      source: random() > 0.9 ? null : 'import',
      history: [{ at: '2025-01-01T00:00:00.000Z', by: 'seed' }],
    },
  };
}

await mkdir(dirname(OUTPUT), { recursive: true });
const stream = createWriteStream(OUTPUT, { encoding: 'utf8' });
const targetBytes = TARGET_MB * BYTES_PER_MB;

function write(chunk) {
  if (stream.write(chunk)) return Promise.resolve();
  return new Promise((done) => stream.once('drain', done));
}

let written = 0;
let id = 0;
await write('[\n');
written += 2;

while (written < targetBytes) {
  const chunk = `${id === 0 ? '' : ',\n'}${JSON.stringify(buildRecord(id))}`;
  await write(chunk);
  written += Buffer.byteLength(chunk);
  id += 1;
}

await write('\n]\n');
await new Promise((done) => stream.end(done));

console.log(`Generado ${OUTPUT}`);
console.log(`  registros: ${id.toLocaleString('en-US')}`);
console.log(`  tamano:    ${(written / BYTES_PER_MB).toFixed(1)} MB`);
