import { isPlainRecord } from './json-value';

const QUOTE = '"';
const DELIMITER = ',';
const ROW_END = '\r\n';
const NEEDS_QUOTING = new Set([QUOTE, DELIMITER, '\n', '\r']);

interface ScanState {
  rows: string[][];
  cells: string[];
  cell: string;
  index: number;
  isQuoted: boolean;
}

export function toCsv(rows: readonly unknown[]): string {
  const columns = columnsOf(rows);
  if (columns.length === 0) return '';
  const header = columns.map(escapeCell).join(DELIMITER);
  return [header, ...rows.map((row) => rowToLine(row, columns))].join(ROW_END);
}

export function fromCsv(text: string): Record<string, unknown>[] {
  const table = parseTable(text);
  const header = table[0];
  if (header === undefined) return [];
  return table.slice(1).map((cells) => rowFromCells(header, cells));
}

function columnsOf(rows: readonly unknown[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) addKeys(seen, row);
  return [...seen];
}

function addKeys(seen: Set<string>, row: unknown): void {
  for (const key of Object.keys(toRecord(row))) seen.add(key);
}

function rowToLine(row: unknown, columns: readonly string[]): string {
  const record = toRecord(row);
  return columns.map((column) => escapeCell(cellText(record[column]))).join(DELIMITER);
}

function cellText(value: unknown): string {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null) return 'null';
  return JSON.stringify(value);
}

function escapeCell(text: string): string {
  if (![...text].some((char) => NEEDS_QUOTING.has(char))) return text;
  return `${QUOTE}${text.replaceAll(QUOTE, QUOTE + QUOTE)}${QUOTE}`;
}

function parseTable(text: string): string[][] {
  const state: ScanState = { rows: [], cells: [], cell: '', index: 0, isQuoted: false };
  while (state.index < text.length) step(text, state);
  if (state.cell !== '' || state.cells.length > 0) endRow(state);
  return state.rows.filter(isMeaningful);
}

function step(text: string, state: ScanState): void {
  if (state.isQuoted) {
    stepQuoted(text, state);
    return;
  }
  const char = text[state.index] ?? '';
  if (char === QUOTE && state.cell === '') {
    state.isQuoted = true;
    state.index += 1;
    return;
  }
  if (char === DELIMITER) {
    endCell(state);
    return;
  }
  if (char === '\n' || char === '\r') {
    endRow(state);
    state.index += char === '\r' && text[state.index + 1] === '\n' ? 2 : 1;
    return;
  }
  state.cell += char;
  state.index += 1;
}

function stepQuoted(text: string, state: ScanState): void {
  const char = text[state.index] ?? '';
  if (char !== QUOTE) {
    state.cell += char;
    state.index += 1;
    return;
  }
  if (text[state.index + 1] === QUOTE) {
    state.cell += QUOTE;
    state.index += 2;
    return;
  }
  state.isQuoted = false;
  state.index += 1;
}

function endCell(state: ScanState): void {
  state.cells.push(state.cell);
  state.cell = '';
  state.index += 1;
}

function endRow(state: ScanState): void {
  state.cells.push(state.cell);
  state.rows.push(state.cells);
  state.cells = [];
  state.cell = '';
}

function isMeaningful(row: readonly string[]): boolean {
  return row.length > 1 || row[0] !== '';
}

function rowFromCells(header: readonly string[], cells: readonly string[]): Record<string, unknown> {
  const record = Object.create(null) as Record<string, unknown>;
  header.forEach((column, position) => {
    record[column] = coerce(cells[position] ?? '');
  });
  return record;
}

function coerce(cell: string): unknown {
  if (cell === '') return '';
  if (cell === 'true') return true;
  if (cell === 'false') return false;
  if (cell === 'null') return null;
  const asNumber = Number(cell);
  return Number.isNaN(asNumber) ? cell : asNumber;
}

function toRecord(value: unknown): Record<string, unknown> {
  return isPlainRecord(value) ? value : {};
}
