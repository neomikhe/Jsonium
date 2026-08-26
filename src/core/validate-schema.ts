import type { PathLink } from './json-path';
import { pathFrom } from './json-path';
import { isArrayValue, isPlainRecord, kindOf } from './json-value';
import { pushReversed } from './stack';

export interface ValidationError {
  path: string;
  keyword: string;
  message: string;
}

export interface ValidationResult {
  errors: ValidationError[];
  isValid: boolean;
  isTruncated: boolean;
  scanMs: number;
}

interface Task {
  value: unknown;
  schema: Record<string, unknown>;
  link: PathLink | null;
}

interface Rule {
  keyword: string;
  holds: (measured: number, bound: number) => boolean;
  message: string;
}

const NUMBER_RULES: readonly Rule[] = [
  { keyword: 'minimum', holds: (v, b) => v >= b, message: 'es menor que minimum' },
  { keyword: 'maximum', holds: (v, b) => v <= b, message: 'es mayor que maximum' },
  { keyword: 'exclusiveMinimum', holds: (v, b) => v > b, message: 'no supera exclusiveMinimum' },
  { keyword: 'exclusiveMaximum', holds: (v, b) => v < b, message: 'no baja de exclusiveMaximum' },
  {
    keyword: 'multipleOf',
    holds: (v, b) => b !== 0 && Number.isInteger(v / b),
    message: 'no es multiplo',
  },
];

const LENGTH_RULES: readonly Rule[] = [
  { keyword: 'minLength', holds: (v, b) => v >= b, message: 'es mas corta que minLength' },
  { keyword: 'maxLength', holds: (v, b) => v <= b, message: 'es mas larga que maxLength' },
];

const SIZE_RULES: readonly Rule[] = [
  { keyword: 'minItems', holds: (v, b) => v >= b, message: 'tiene menos de minItems' },
  { keyword: 'maxItems', holds: (v, b) => v <= b, message: 'tiene mas de maxItems' },
];

const CHECKS: readonly ((task: Task) => ValidationError[])[] = [
  checkType,
  checkEnum,
  checkConst,
  checkNumbers,
  checkStrings,
  checkArrays,
  checkRequired,
  checkAdditional,
  checkCombinators,
];

export function validateSchema(value: unknown, schema: unknown, limit: number): ValidationResult {
  const startedAt = performance.now();
  if (!isPlainRecord(schema)) {
    return {
      errors: [{ path: '$', keyword: 'schema', message: 'El esquema debe ser un objeto' }],
      isValid: false,
      isTruncated: false,
      scanMs: performance.now() - startedAt,
    };
  }

  const errors: ValidationError[] = [];
  const stack: Task[] = [{ value, schema, link: null }];

  while (stack.length > 0 && errors.length < limit) {
    const task = stack.pop();
    if (task === undefined) break;
    for (const check of CHECKS) errors.push(...check(task));
    pushReversed(stack, childTasks(task));
  }

  return {
    errors: errors.slice(0, limit),
    isValid: errors.length === 0,
    isTruncated: errors.length >= limit,
    scanMs: performance.now() - startedAt,
  };
}

function checkType(task: Task): ValidationError[] {
  const expected = task.schema['type'];
  if (expected === undefined) return [];
  const allowed = isArrayValue(expected) ? expected : [expected];
  if (matchesType(task.value, allowed)) return [];
  return [fault(task, 'type', `se esperaba ${allowed.join(' o ')} y hay ${kindOf(task.value)}`)];
}

function matchesType(value: unknown, allowed: readonly unknown[]): boolean {
  if (allowed.includes(kindOf(value))) return true;
  return allowed.includes('integer') && typeof value === 'number' && Number.isInteger(value);
}

function checkEnum(task: Task): ValidationError[] {
  const options = task.schema['enum'];
  if (!isArrayValue(options)) return [];
  const encoded = JSON.stringify(task.value);
  if (options.some((option) => JSON.stringify(option) === encoded)) return [];
  return [fault(task, 'enum', 'el valor no esta entre los permitidos')];
}

function checkConst(task: Task): ValidationError[] {
  if (!Object.hasOwn(task.schema, 'const')) return [];
  if (JSON.stringify(task.schema['const']) === JSON.stringify(task.value)) return [];
  return [fault(task, 'const', 'el valor no coincide con const')];
}

function checkNumbers(task: Task): ValidationError[] {
  if (typeof task.value !== 'number') return [];
  return NUMBER_RULES.flatMap((rule) => applyRule(task, rule, task.value as number));
}

function checkStrings(task: Task): ValidationError[] {
  if (typeof task.value !== 'string') return [];
  const text = task.value;
  return [
    ...LENGTH_RULES.flatMap((rule) => applyRule(task, rule, text.length)),
    ...checkPattern(task, text),
  ];
}

function checkArrays(task: Task): ValidationError[] {
  if (!isArrayValue(task.value)) return [];
  const items = task.value;
  return [
    ...SIZE_RULES.flatMap((rule) => applyRule(task, rule, items.length)),
    ...checkUnique(task, items),
  ];
}

function applyRule(task: Task, rule: Rule, measured: number): ValidationError[] {
  const bound = task.schema[rule.keyword];
  if (typeof bound !== 'number') return [];
  if (rule.holds(measured, bound)) return [];
  return [fault(task, rule.keyword, `${rule.message} (${bound.toString()})`)];
}

function checkPattern(task: Task, text: string): ValidationError[] {
  const pattern = task.schema['pattern'];
  if (typeof pattern !== 'string') return [];
  const matcher = compile(pattern);
  if (matcher === null) return [fault(task, 'pattern', `patron no valido: ${pattern}`)];
  return matcher.test(text) ? [] : [fault(task, 'pattern', `no cumple el patron ${pattern}`)];
}

function compile(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern, 'u');
  } catch {
    return null;
  }
}

function checkUnique(task: Task, items: readonly unknown[]): ValidationError[] {
  if (task.schema['uniqueItems'] !== true) return [];
  const seen = new Set(items.map((item) => JSON.stringify(item)));
  if (seen.size === items.length) return [];
  return [fault(task, 'uniqueItems', 'hay elementos repetidos')];
}

function checkRequired(task: Task): ValidationError[] {
  const required = task.schema['required'];
  if (!isArrayValue(required) || !isPlainRecord(task.value)) return [];
  const record = task.value;
  return required
    .filter((key) => typeof key === 'string' && !Object.hasOwn(record, key))
    .map((key) => fault(task, 'required', `falta la clave ${String(key)}`));
}

function checkAdditional(task: Task): ValidationError[] {
  if (task.schema['additionalProperties'] !== false || !isPlainRecord(task.value)) return [];
  const known = new Set(Object.keys(toRecord(task.schema['properties'])));
  return Object.keys(task.value)
    .filter((key) => !known.has(key))
    .map((key) => fault(task, 'additionalProperties', `clave no permitida: ${key}`));
}

function checkCombinators(task: Task): ValidationError[] {
  return [
    ...checkBranches(task, 'allOf'),
    ...checkBranches(task, 'anyOf'),
    ...checkBranches(task, 'oneOf'),
  ];
}

function checkBranches(task: Task, keyword: string): ValidationError[] {
  const branches = task.schema[keyword];
  if (!isArrayValue(branches)) return [];
  const passing = branches.filter((branch) => validateSchema(task.value, branch, 1).isValid).length;
  if (isSatisfied(keyword, passing, branches.length)) return [];
  return [fault(task, keyword, `${passing.toString()} de ${branches.length.toString()} cumplen`)];
}

function isSatisfied(keyword: string, passing: number, total: number): boolean {
  if (keyword === 'allOf') return passing === total;
  if (keyword === 'oneOf') return passing === 1;
  return passing > 0;
}

function childTasks(task: Task): Task[] {
  if (isArrayValue(task.value)) return itemTasks(task, task.value);
  if (isPlainRecord(task.value)) return propertyTasks(task, task.value);
  return [];
}

function itemTasks(task: Task, items: readonly unknown[]): Task[] {
  const schema = task.schema['items'];
  if (!isPlainRecord(schema)) return [];
  return items.map((value, index) => ({
    value,
    schema,
    link: { parent: task.link, key: null, index },
  }));
}

function propertyTasks(task: Task, record: Record<string, unknown>): Task[] {
  const properties = toRecord(task.schema['properties']);
  const extra = task.schema['additionalProperties'];
  const tasks: Task[] = [];

  for (const key of Object.keys(record)) {
    const schema = properties[key] ?? extra;
    if (!isPlainRecord(schema)) continue;
    tasks.push({ value: record[key], schema, link: { parent: task.link, key, index: null } });
  }

  return tasks;
}

function toRecord(value: unknown): Record<string, unknown> {
  return isPlainRecord(value) ? value : {};
}

function fault(task: Task, keyword: string, message: string): ValidationError {
  return { path: pathFrom(task.link), keyword, message };
}
