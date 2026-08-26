import { isArrayValue, isPlainRecord } from './json-value';
import { mulberry32 } from './random';

const MAX_DEPTH = 32;
const WORDS = ['alfa', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta'];
const NAMES = ['Ada', 'Linus', 'Grace', 'Alan', 'Barbara', 'Dennis', 'Margaret', 'Ken'];
const CITIES = ['Madrid', 'Lisboa', 'Oporto', 'Vigo', 'Sevilla', 'Bilbao'];
const MAX_INT = 1000;
const CENTS = 100;
const COIN = 0.5;
const MOCK_YEAR = 2026;
const MONTHS = 12;

export interface MockOptions {
  count: number;
  seed: number;
}

interface Context {
  next: () => number;
  depth: number;
  count: number;
}

export function generateMock(schema: unknown, options: MockOptions): unknown {
  if (!isPlainRecord(schema)) return null;
  const context: Context = { next: mulberry32(options.seed), depth: 0, count: options.count };
  return valueFor(schema, '', context);
}

function valueFor(schema: Record<string, unknown>, key: string, context: Context): unknown {
  if (context.depth > MAX_DEPTH) return null;
  const fixed = fixedValue(schema, context);
  if (fixed !== undefined) return fixed;

  const type = firstType(schema['type']);
  if (type === 'object') return objectFor(schema, context);
  if (type === 'array') return arrayFor(schema, context);
  if (type === 'boolean') return context.next() > COIN;
  if (type === 'number' || type === 'integer') return numberFor(schema, key, context);
  if (type === 'null') return null;
  return stringFor(schema, key, context);
}

function fixedValue(schema: Record<string, unknown>, context: Context): unknown {
  if (Object.hasOwn(schema, 'const')) return schema['const'];
  const options = schema['enum'];
  if (!isArrayValue(options) || options.length === 0) return undefined;
  return options[Math.floor(context.next() * options.length)];
}

function objectFor(schema: Record<string, unknown>, context: Context): unknown {
  const properties = toRecord(schema['properties']);
  const inner: Context = { ...context, depth: context.depth + 1 };
  const entries = Object.keys(properties).map((key) => [
    key,
    valueFor(toRecord(properties[key]), key, inner),
  ]);
  return Object.fromEntries(entries);
}

function arrayFor(schema: Record<string, unknown>, context: Context): unknown {
  const items = schema['items'];
  if (!isPlainRecord(items)) return [];
  const inner: Context = { ...context, depth: context.depth + 1 };
  const total = sizeFor(schema, context.count);
  return Array.from({ length: total }, () => valueFor(items, '', inner));
}

function sizeFor(schema: Record<string, unknown>, count: number): number {
  const min = typeof schema['minItems'] === 'number' ? schema['minItems'] : 0;
  const max = typeof schema['maxItems'] === 'number' ? schema['maxItems'] : count;
  return Math.max(min, Math.min(count, max));
}

function numberFor(schema: Record<string, unknown>, key: string, context: Context): number {
  const min = typeof schema['minimum'] === 'number' ? schema['minimum'] : 0;
  const max = typeof schema['maximum'] === 'number' ? schema['maximum'] : min + MAX_INT;
  const raw = min + context.next() * (max - min);
  if (schema['type'] === 'integer') return Math.round(raw);
  return isMoney(key) ? Math.round(raw * CENTS) / CENTS : Math.round(raw);
}

function stringFor(schema: Record<string, unknown>, key: string, context: Context): string {
  const base = hintedString(key, context);
  const min = typeof schema['minLength'] === 'number' ? schema['minLength'] : 0;
  const max = typeof schema['maxLength'] === 'number' ? schema['maxLength'] : base.length;
  if (base.length > max) return base.slice(0, max);
  return base.length < min ? base.padEnd(min, 'x') : base;
}

function hintedString(key: string, context: Context): string {
  const lower = key.toLowerCase();
  if (lower.includes('mail')) return `usuario${digits(context)}@example.invalid`;
  if (lower.includes('name') || lower.includes('nombre')) return pick(NAMES, context);
  if (lower.includes('city') || lower.includes('ciudad')) return pick(CITIES, context);
  if (lower.includes('url') || lower.includes('link')) return `https://example.invalid/${digits(context)}`;
  if (isDateKey(lower)) return new Date(Date.UTC(MOCK_YEAR, digits(context) % MONTHS, 1)).toISOString();
  if (lower.includes('id')) return `id-${digits(context)}`;
  return `${pick(WORDS, context)} ${digits(context)}`;
}

function isDateKey(lower: string): boolean {
  return lower.includes('date') || lower.includes('fecha') || lower.endsWith('at');
}

function isMoney(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.includes('price') || lower.includes('precio') || lower.includes('amount');
}

function pick(values: readonly string[], context: Context): string {
  return values[Math.floor(context.next() * values.length)] ?? values[0] ?? '';
}

function digits(context: Context): number {
  return Math.floor(context.next() * MAX_INT);
}

function firstType(type: unknown): string {
  if (typeof type === 'string') return type;
  if (isArrayValue(type) && typeof type[0] === 'string') return type[0];
  return 'string';
}

function toRecord(value: unknown): Record<string, unknown> {
  return isPlainRecord(value) ? value : {};
}
