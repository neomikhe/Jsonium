import { isArrayValue, isPlainRecord } from './json-value';

const MAX_TYPES = 200;

export type Language = 'typescript' | 'go' | 'python' | 'rust';

export interface TypeField {
  name: string;
  ref: TypeRef;
  isRequired: boolean;
}

export interface NamedType {
  name: string;
  fields: TypeField[];
}

export type TypeRef =
  | { kind: 'primitive'; name: string }
  | { kind: 'named'; name: string }
  | { kind: 'array'; of: TypeRef }
  | { kind: 'unknown' };

interface Pending {
  name: string;
  schema: Record<string, unknown>;
}

export function collectTypes(schema: unknown): NamedType[] {
  if (!isPlainRecord(schema)) return [];
  return new Collector().run(schema);
}

class Collector {
  private readonly types: NamedType[] = [];
  private readonly taken = new Set<string>();
  private readonly queue: Pending[] = [];

  run(schema: Record<string, unknown>): NamedType[] {
    this.refFor(schema, 'Root');
    while (this.queue.length > 0 && this.types.length < MAX_TYPES) {
      const pending = this.queue.shift();
      if (pending === undefined) break;
      this.types.push({ name: pending.name, fields: this.fieldsOf(pending.schema) });
    }
    return this.types;
  }

  private fieldsOf(schema: Record<string, unknown>): TypeField[] {
    const properties = toRecord(schema['properties']);
    const required = new Set(toArray(schema['required']).map(String));
    return Object.keys(properties).map((key) => ({
      name: key,
      ref: this.refFor(properties[key], key),
      isRequired: required.has(key),
    }));
  }

  private refFor(schema: unknown, suggested: string): TypeRef {
    if (!isPlainRecord(schema)) return { kind: 'unknown' };
    const type = schema['type'];
    if (isArrayValue(type)) return { kind: 'unknown' };
    if (type === 'array') return { kind: 'array', of: this.refFor(schema['items'], singular(suggested)) };
    if (type === 'object') return this.namedRef(schema, suggested);
    return { kind: 'primitive', name: typeof type === 'string' ? type : 'unknown' };
  }

  private namedRef(schema: Record<string, unknown>, suggested: string): TypeRef {
    if (!isPlainRecord(schema['properties'])) return { kind: 'unknown' };
    return { kind: 'named', name: this.enqueue(pascal(suggested), schema) };
  }

  private enqueue(preferred: string, schema: Record<string, unknown>): string {
    const name = this.uniqueName(preferred === '' ? 'Item' : preferred);
    this.queue.push({ name, schema });
    return name;
  }

  private uniqueName(preferred: string): string {
    if (!this.taken.has(preferred)) {
      this.taken.add(preferred);
      return preferred;
    }
    let suffix = 2;
    while (this.taken.has(`${preferred}${suffix.toString()}`)) suffix += 1;
    const name = `${preferred}${suffix.toString()}`;
    this.taken.add(name);
    return name;
  }
}

export function generateTypes(schema: unknown, language: Language): string {
  const types = collectTypes(schema);
  if (types.length === 0) return '';
  if (language === 'go') return types.map(goType).join('\n\n');
  if (language === 'python') return `${PYTHON_HEADER}\n\n${types.map(pythonType).join('\n\n')}`;
  if (language === 'rust') return types.map(rustType).join('\n\n');
  return types.map(typescriptType).join('\n\n');
}

const PYTHON_HEADER = 'from __future__ import annotations\n\nfrom dataclasses import dataclass';

function typescriptType(type: NamedType): string {
  const lines = type.fields.map(
    (field) => `  ${quoteKey(field.name)}${field.isRequired ? '' : '?'}: ${tsRef(field.ref)};`,
  );
  return `export interface ${type.name} {\n${lines.join('\n')}\n}`;
}

function tsRef(ref: TypeRef): string {
  if (ref.kind === 'array') return `${tsRef(ref.of)}[]`;
  if (ref.kind === 'named') return ref.name;
  if (ref.kind === 'unknown') return 'unknown';
  return TS_PRIMITIVES[ref.name] ?? 'unknown';
}

const TS_PRIMITIVES: Record<string, string> = {
  string: 'string',
  number: 'number',
  integer: 'number',
  boolean: 'boolean',
  null: 'null',
};

function goType(type: NamedType): string {
  return `type ${type.name} struct {\n${type.fields.map(goField).join('\n')}\n}`;
}

function goField(field: TypeField): string {
  const base = goRef(field.ref);
  const pointer = field.isRequired || base === 'any' ? base : `*${base}`;
  const tag = field.isRequired ? field.name : `${field.name},omitempty`;
  return `\t${pascal(field.name)} ${pointer} \`json:"${tag}"\``;
}

function goRef(ref: TypeRef): string {
  if (ref.kind === 'array') return `[]${goRef(ref.of)}`;
  if (ref.kind === 'named') return ref.name;
  if (ref.kind === 'unknown') return 'any';
  return GO_PRIMITIVES[ref.name] ?? 'any';
}

const GO_PRIMITIVES: Record<string, string> = {
  string: 'string',
  number: 'float64',
  integer: 'int64',
  boolean: 'bool',
  null: 'any',
};

function pythonType(type: NamedType): string {
  const lines = type.fields.map((field) => `    ${snake(field.name)}: ${pythonRef(field)}`);
  return `@dataclass\nclass ${type.name}:\n${lines.join('\n')}`;
}

function pythonRef(field: TypeField): string {
  const base = pythonBase(field.ref);
  return field.isRequired ? base : `${base} | None = None`;
}

function pythonBase(ref: TypeRef): string {
  if (ref.kind === 'array') return `list[${pythonBase(ref.of)}]`;
  if (ref.kind === 'named') return ref.name;
  if (ref.kind === 'unknown') return 'object';
  return PYTHON_PRIMITIVES[ref.name] ?? 'object';
}

const PYTHON_PRIMITIVES: Record<string, string> = {
  string: 'str',
  number: 'float',
  integer: 'int',
  boolean: 'bool',
  null: 'None',
};

function rustType(type: NamedType): string {
  const lines = type.fields.map((field) => `    pub ${snake(field.name)}: ${rustRef(field)},`);
  return `#[derive(Debug, Serialize, Deserialize)]\npub struct ${type.name} {\n${lines.join('\n')}\n}`;
}

function rustRef(field: TypeField): string {
  const base = rustBase(field.ref);
  return field.isRequired ? base : `Option<${base}>`;
}

function rustBase(ref: TypeRef): string {
  if (ref.kind === 'array') return `Vec<${rustBase(ref.of)}>`;
  if (ref.kind === 'named') return ref.name;
  if (ref.kind === 'unknown') return 'serde_json::Value';
  return RUST_PRIMITIVES[ref.name] ?? 'serde_json::Value';
}

const RUST_PRIMITIVES: Record<string, string> = {
  string: 'String',
  number: 'f64',
  integer: 'i64',
  boolean: 'bool',
  null: 'serde_json::Value',
};

function quoteKey(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

function pascal(name: string): string {
  const parts = name.split(/[^A-Za-z0-9]+/).filter((part) => part !== '');
  if (parts.length === 0) return 'Item';
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

function snake(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .toLowerCase();
}

const IES_LENGTH = 3;

function singular(name: string): string {
  if (name.endsWith('ies')) return `${name.slice(0, -IES_LENGTH)}y`;
  if (name.endsWith('s') && !name.endsWith('ss')) return name.slice(0, -1);
  return name;
}

function toRecord(value: unknown): Record<string, unknown> {
  return isPlainRecord(value) ? value : {};
}

function toArray(value: unknown): readonly unknown[] {
  return isArrayValue(value) ? value : [];
}
