import { expect, test } from 'vitest';
import { seconds, minutes, hours, millisec, ms } from '@/util/time';

test('milliseconds', () => {
  // identify function
  expect(millisec(1)).toBe(1);
  expect(ms(1)).toBe(1);
});

test('seconds', () => {
  expect(seconds(1)).toBe(ms(1000));
  expect(seconds(0.5)).toBe(millisec(500));
});

test('minutes', () => {
  expect(minutes(1)).toBe(60000);
  expect(minutes(0.25)).toBe(seconds(15));
});

test('hours', () => {
  expect(hours(1)).toBe(minutes(60));
  expect(hours(1)).toBe(seconds(3600));
  expect(hours(1)).toBe(millisec(3600_000));
});
