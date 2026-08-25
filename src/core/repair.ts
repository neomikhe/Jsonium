export type RepairKind =
  | 'trailingComma'
  | 'singleQuote'
  | 'smartQuote'
  | 'unquotedKey'
  | 'comment'
  | 'literal';

export interface RepairFix {
  kind: RepairKind;
  count: number;
}

export interface RepairResult {
  text: string;
  fixes: RepairFix[];
}

interface QuoteSpec {
  closing: string;
  fix: RepairKind | null;
}

const BACKSLASH = '\\';
const DOUBLE_QUOTE = '"';
const ESCAPED_QUOTE = '\\"';

const QUOTES = new Map<string, QuoteSpec>([
  [DOUBLE_QUOTE, { closing: DOUBLE_QUOTE, fix: null }],
  ["'", { closing: "'", fix: 'singleQuote' }],
  ['“', { closing: '”', fix: 'smartQuote' }],
  ['‘', { closing: '’', fix: 'smartQuote' }],
]);

const LITERALS = new Map<string, string>([
  ['True', 'true'],
  ['False', 'false'],
  ['None', 'null'],
  ['NaN', 'null'],
  ['Infinity', 'null'],
  ['undefined', 'null'],
]);

const LINE_COMMENT_END = '\n';
const BLOCK_COMMENT_END = '*/';

export function repair(source: string): RepairResult {
  return new Repairer(source).run();
}

class Repairer {
  private index = 0;
  private readonly source: string;
  private readonly out: string[] = [];
  private readonly counts = new Map<RepairKind, number>();

  constructor(source: string) {
    this.source = source;
  }

  run(): RepairResult {
    while (this.index < this.source.length) {
      const before = this.index;
      this.step();
      if (this.index === before) this.copyChar();
    }
    return { text: this.out.join(''), fixes: this.buildFixes() };
  }

  private step(): void {
    if (this.handleQuote()) return;
    if (this.handleComment()) return;
    if (this.handleTrailingComma()) return;
    if (this.handleWord()) return;
    this.copyChar();
  }

  private handleQuote(): boolean {
    const spec = QUOTES.get(this.charAt(this.index));
    if (spec === undefined) return false;
    this.readString(spec);
    return true;
  }

  private readString(spec: QuoteSpec): void {
    this.index += 1;
    const body: string[] = [];
    while (this.index < this.source.length) {
      const char = this.charAt(this.index);
      if (char === BACKSLASH) {
        body.push(this.readEscape(spec));
        continue;
      }
      if (char === spec.closing) {
        this.index += 1;
        break;
      }
      body.push(char === DOUBLE_QUOTE ? ESCAPED_QUOTE : char);
      this.index += 1;
    }
    if (spec.fix !== null) this.count(spec.fix);
    this.out.push(`${DOUBLE_QUOTE}${body.join('')}${DOUBLE_QUOTE}`);
  }

  private readEscape(spec: QuoteSpec): string {
    const next = this.charAt(this.index + 1);
    this.index += 2;
    if (next === '') return '';
    if (next === spec.closing && spec.closing !== DOUBLE_QUOTE) return next;
    return `${BACKSLASH}${next}`;
  }

  private handleComment(): boolean {
    if (this.charAt(this.index) !== '/') return false;
    const next = this.charAt(this.index + 1);
    if (next === '/') return this.skipComment(LINE_COMMENT_END, false);
    if (next === '*') return this.skipComment(BLOCK_COMMENT_END, true);
    return false;
  }

  private skipComment(marker: string, consumeMarker: boolean): boolean {
    const found = this.source.indexOf(marker, this.index + 2);
    const tail = consumeMarker ? marker.length : 0;
    this.index = found === -1 ? this.source.length : found + tail;
    this.count('comment');
    return true;
  }

  private handleTrailingComma(): boolean {
    if (this.charAt(this.index) !== ',') return false;
    const next = this.nextMeaningful(this.index + 1);
    if (next !== '}' && next !== ']') return false;
    this.index += 1;
    this.count('trailingComma');
    return true;
  }

  private handleWord(): boolean {
    const start = this.index;
    if (!isWordStart(this.charAt(start))) return false;
    let end = start;
    while (end < this.source.length && isWordPart(this.charAt(end))) end += 1;
    const word = this.source.slice(start, end);
    if (this.nextMeaningful(end) === ':') {
      return this.emitWord(`${DOUBLE_QUOTE}${word}${DOUBLE_QUOTE}`, end, 'unquotedKey');
    }
    const literal = LITERALS.get(word);
    if (literal === undefined) return false;
    return this.emitWord(literal, end, 'literal');
  }

  private emitWord(text: string, end: number, kind: RepairKind): boolean {
    this.out.push(text);
    this.index = end;
    this.count(kind);
    return true;
  }

  private nextMeaningful(from: number): string {
    let cursor = from;
    while (cursor < this.source.length) {
      const char = this.charAt(cursor);
      if (!isSpace(char)) return char;
      cursor += 1;
    }
    return '';
  }

  private copyChar(): void {
    this.out.push(this.charAt(this.index));
    this.index += 1;
  }

  private charAt(position: number): string {
    return this.source[position] ?? '';
  }

  private count(kind: RepairKind): void {
    this.counts.set(kind, (this.counts.get(kind) ?? 0) + 1);
  }

  private buildFixes(): RepairFix[] {
    return [...this.counts].map(([kind, count]) => ({ kind, count }));
  }
}

function isWordStart(char: string): boolean {
  return /[A-Za-z_$]/.test(char);
}

function isWordPart(char: string): boolean {
  return /[A-Za-z0-9_$]/.test(char);
}

function isSpace(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}
