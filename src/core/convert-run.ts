import { dump, load } from 'js-yaml';
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import type { ConvertFormat } from './convert';
import { fromCsv, toCsv } from './csv';
import { isArrayValue, isPlainRecord } from './json-value';

const YAML_INDENT = 2;

export function toFormat(value: unknown, format: ConvertFormat): string {
  if (format === 'yaml') return dump(value, { indent: YAML_INDENT, noRefs: true });
  if (format === 'toml') return toTomlText(value);
  return toCsvText(value);
}

export function fromFormat(text: string, format: ConvertFormat): unknown {
  if (format === 'yaml') return toJsonSafe(load(text));
  if (format === 'toml') return toJsonSafe(parseToml(text));
  return fromCsv(text);
}

function toTomlText(value: unknown): string {
  if (!isPlainRecord(value)) throw new Error('TOML exige un objeto en la raiz');
  return stringifyToml(value);
}

function toCsvText(value: unknown): string {
  if (!isArrayValue(value)) throw new Error('CSV necesita un array de filas en la raiz');
  return toCsv(value);
}

function toJsonSafe(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value ?? null));
  } catch (cause) {
    throw new Error('El documento tiene referencias circulares y JSON no puede representarlas', {
      cause,
    });
  }
}
