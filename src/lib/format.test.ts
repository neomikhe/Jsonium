import { describe, expect, it } from 'vitest';
import { formatBytes, formatCount, formatDuration } from './format';

describe('formatBytes', () => {
  it('usa la unidad mas legible', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(104_857_600)).toBe('100.0 MB');
  });
});

describe('formatDuration', () => {
  it('cambia a segundos por encima de 1000 ms', () => {
    expect(formatDuration(250)).toBe('250 ms');
    expect(formatDuration(4200)).toBe('4.2 s');
  });
});

describe('formatCount', () => {
  it('agrupa millares', () => {
    expect(formatCount(1_234_567)).toBe('1,234,567');
  });
});
