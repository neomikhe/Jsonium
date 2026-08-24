const BYTES_PER_UNIT = 1024;
const UNITS = ['B', 'KB', 'MB', 'GB'] as const;
const MS_PER_SECOND = 1000;
const DECIMALS = 1;

export function formatBytes(bytes: number): string {
  let size = bytes;
  let unitIndex = 0;
  while (size >= BYTES_PER_UNIT && unitIndex < UNITS.length - 1) {
    size /= BYTES_PER_UNIT;
    unitIndex += 1;
  }
  const unit = UNITS[unitIndex] ?? 'B';
  return `${size.toFixed(unitIndex === 0 ? 0 : DECIMALS)} ${unit}`;
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds < MS_PER_SECOND) return `${milliseconds.toFixed(0)} ms`;
  return `${(milliseconds / MS_PER_SECOND).toFixed(DECIMALS)} s`;
}

export function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}
