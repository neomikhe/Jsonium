const SIMPLE_KEY = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export const ROOT_PATH = '$';

export interface PathLink {
  parent: PathLink | null;
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
    segments.push(segmentOf(current.key, current.index));
    current = current.parent;
  }
  return `${ROOT_PATH}${segments.toReversed().join('')}`;
}
