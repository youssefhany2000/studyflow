import { describe, expect, it } from 'vitest';

import { formatDuration } from './format';

describe('formatDuration', () => {
  it('shows minutes only when under an hour', () => {
    expect(formatDuration(1500)).toBe('25 min');
  });

  it('rounds to the nearest minute', () => {
    expect(formatDuration(90)).toBe('2 min'); // 1.5 min rounds up
    expect(formatDuration(89)).toBe('1 min'); // 1.48 min rounds down
  });

  it('shows hours with no minutes when exactly on the hour', () => {
    expect(formatDuration(3600)).toBe('1h');
  });

  it('shows hours and minutes together otherwise', () => {
    expect(formatDuration(3900)).toBe('1h 5m');
  });

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0 min');
  });
});
