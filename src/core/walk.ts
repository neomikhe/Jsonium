import type { PathLink } from './json-path';
import { isArrayValue, isPlainRecord } from './json-value';

export interface WalkFrame {
  value: unknown;
  link: PathLink | null;
}

export function childFrames(frame: WalkFrame): WalkFrame[] {
  const items = frame.value;
  if (isArrayValue(items)) {
    return items.map((item, index) => ({
      value: item,
      link: { parent: frame.link, key: null, index },
    }));
  }
  if (!isPlainRecord(frame.value)) return [];
  const record = frame.value;
  return Object.keys(record).map((key) => ({
    value: record[key],
    link: { parent: frame.link, key, index: null },
  }));
}
