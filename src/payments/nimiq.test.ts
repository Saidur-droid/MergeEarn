import { describe, expect, it } from 'vitest';
import { nimToLuna } from './nimiq';

describe('nimToLuna', () => {
  it('converts whole NIM to Luna', () => {
    expect(nimToLuna('1')).toBe(100_000);
  });

  it('converts fractional NIM exactly to five decimal places', () => {
    expect(nimToLuna('1.23456')).toBe(123_456);
    expect(nimToLuna('0.00001')).toBe(1);
  });

  it('rejects zero and malformed amounts', () => {
    expect(() => nimToLuna('0')).toThrow('greater than zero');
    expect(() => nimToLuna('-1')).toThrow('positive number');
    expect(() => nimToLuna('1.234567')).toThrow('up to 5 decimal places');
  });
});
