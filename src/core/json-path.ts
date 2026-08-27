const SIMPLE_KEY = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const BACKSLASH = '\\';
const QUOTE = '"';
const BREAKERS = '.[';

export const ROOT_PATH = '$';

export interface PathLink {
  parent: PathLink | null;
  key: string | null;
  index: number | null;
  token?: string;
}

export interface PathSegment {
  key: string | null;
  index: number | null;
}

export function segmentOf(key: string | null, index: number | null): string {
  if (index !== null) return `[${index.toString()}]`;
  if (key === null) return '';
  return SIMPLE_KEY.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`;
}

export function pathFrom(link: PathLink | null): string {
  const segments: string[] = [];
  let current = link;
  while (current !== null) {
    segments.push(current.token ?? segmentOf(current.key, current.index));
    current = current.parent;
  }
  return `${ROOT_PATH}${segments.toReversed().join('')}`;
}

export function segmentsOf(path: string): PathSegment[] | null {
  if (!path.startsWith(ROOT_PATH)) return null;
  return new SegmentScanner(path).run();
}

class SegmentScanner {
  private at = ROOT_PATH.length;
  private readonly segments: PathSegment[] = [];

  constructor(private readonly path: string) {}

  run(): PathSegment[] | null {
    while (this.at < this.path.length) {
      const char = this.path[this.at];
      if (char === '.' && this.readDotted()) continue;
      if (char === '[' && this.readBracketed()) continue;
      return null;
    }
    return this.segments;
  }

  private readDotted(): boolean {
    this.at += 1;
    const start = this.at;
    while (this.at < this.path.length && !BREAKERS.includes(this.path[this.at] ?? '')) {
      this.at += 1;
    }
    if (this.at === start) return false;
    this.segments.push({ key: this.path.slice(start, this.at), index: null });
    return true;
  }

  private readBracketed(): boolean {
    const start = this.at + 1;
    const close =
      this.path[start] === QUOTE ? this.endOfQuoted(start) : this.path.indexOf(']', start);
    if (close === -1) return false;
    const inner = this.path.slice(start, close);
    this.at = close + 1;
    return inner.startsWith(QUOTE) ? this.pushQuoted(inner) : this.pushIndex(inner);
  }

  private endOfQuoted(start: number): number {
    let at = start + 1;
    while (at < this.path.length) {
      const char = this.path[at];
      if (char === BACKSLASH) at += 2;
      else if (char === QUOTE) return this.path[at + 1] === ']' ? at + 1 : -1;
      else at += 1;
    }
    return -1;
  }

  private pushQuoted(inner: string): boolean {
    const key: unknown = safeParse(inner);
    if (typeof key !== 'string') return false;
    this.segments.push({ key, index: null });
    return true;
  }

  private pushIndex(inner: string): boolean {
    const index = Number(inner);
    if (inner === '' || !Number.isInteger(index) || index < 0) return false;
    this.segments.push({ key: null, index });
    return true;
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
