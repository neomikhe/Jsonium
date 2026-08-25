import { ROOT_PATH, segmentOf } from './json-path';

const OPENERS = '{[';
const CLOSERS = '}]';
const QUOTE = '"';
const BACKSLASH = '\\';

export interface Span {
  from: number;
  to: number;
}

interface Frame {
  path: string;
  isArray: boolean;
  index: number;
}

export function locatePath(text: string, target: string): Span | null {
  return new Locator(text, target).find();
}

class Locator {
  private index = 0;
  private readonly text: string;
  private readonly target: string;
  private readonly frames: Frame[] = [];

  constructor(text: string, target: string) {
    this.text = text;
    this.target = target;
  }

  find(): Span | null {
    this.skipSpace();
    const rootSpan = this.consume(ROOT_PATH);
    if (rootSpan !== null) return rootSpan;

    while (this.frames.length > 0) {
      const span = this.step();
      if (span !== null) return span;
    }
    return null;
  }

  private step(): Span | null {
    this.skipSeparators();
    const frame = this.frames[this.frames.length - 1];
    if (frame === undefined) return null;
    if (this.isAtCloser()) {
      this.frames.pop();
      this.index += 1;
      return null;
    }
    const path = frame.isArray ? this.arrayPath(frame) : this.objectPath(frame);
    if (path === null) return null;
    this.skipSpace();
    return this.consume(path);
  }

  private arrayPath(frame: Frame): string {
    const path = `${frame.path}${segmentOf(null, frame.index)}`;
    frame.index += 1;
    return path;
  }

  private objectPath(frame: Frame): string | null {
    if (this.charAt(this.index) !== QUOTE) return null;
    const end = skipString(this.text, this.index);
    const key = safeParseKey(this.text.slice(this.index, end));
    this.index = end;
    this.skipSpace();
    if (this.charAt(this.index) !== ':') return null;
    this.index += 1;
    return key === null ? null : `${frame.path}${segmentOf(key, null)}`;
  }

  private consume(path: string): Span | null {
    const start = this.index;
    if (path === this.target) return { from: start, to: skipValue(this.text, start) };
    if (OPENERS.includes(this.charAt(start))) {
      this.frames.push({ path, isArray: this.charAt(start) === '[', index: 0 });
      this.index = start + 1;
      return null;
    }
    this.index = skipValue(this.text, start);
    return null;
  }

  private isAtCloser(): boolean {
    return CLOSERS.includes(this.charAt(this.index));
  }

  private skipSeparators(): void {
    this.skipSpace();
    while (this.charAt(this.index) === ',') {
      this.index += 1;
      this.skipSpace();
    }
  }

  private skipSpace(): void {
    while (this.index < this.text.length && isSpace(this.charAt(this.index))) this.index += 1;
  }

  private charAt(position: number): string {
    return this.text[position] ?? '';
  }
}

function skipValue(text: string, start: number): number {
  const first = text[start] ?? '';
  if (first === QUOTE) return skipString(text, start);
  if (!OPENERS.includes(first)) return skipScalar(text, start);

  let depth = 0;
  let index = start;
  while (index < text.length) {
    const char = text[index] ?? '';
    if (char === QUOTE) {
      index = skipString(text, index);
      continue;
    }
    depth += depthDelta(char);
    if (depth === 0 && CLOSERS.includes(char)) return index + 1;
    index += 1;
  }
  return text.length;
}

function skipString(text: string, start: number): number {
  let index = start + 1;
  while (index < text.length) {
    const char = text[index] ?? '';
    if (char === BACKSLASH) {
      index += 2;
      continue;
    }
    if (char === QUOTE) return index + 1;
    index += 1;
  }
  return text.length;
}

function skipScalar(text: string, start: number): number {
  let index = start;
  while (index < text.length && !isScalarEnd(text[index] ?? '')) index += 1;
  return index;
}

function depthDelta(char: string): number {
  if (OPENERS.includes(char)) return 1;
  return CLOSERS.includes(char) ? -1 : 0;
}

function isScalarEnd(char: string): boolean {
  return char === ',' || CLOSERS.includes(char) || isSpace(char);
}

function isSpace(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}

function safeParseKey(raw: string): string | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    return null;
  }
}
