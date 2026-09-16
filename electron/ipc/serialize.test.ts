import { describe, expect, it } from 'vitest';

import { toBool } from './serialize';

describe('toBool', () => {
  it('converts SQLite integer 1 to true', () => {
    expect(toBool(1)).toBe(true);
  });

  it('converts SQLite integer 0 to false', () => {
    expect(toBool(0)).toBe(false);
  });

  it('passes real booleans through unchanged', () => {
    expect(toBool(true)).toBe(true);
    expect(toBool(false)).toBe(false);
  });

  it('treats anything unexpected as false rather than throwing', () => {
    expect(toBool(null)).toBe(false);
    expect(toBool(undefined)).toBe(false);
    expect(toBool(2)).toBe(false);
  });
});
