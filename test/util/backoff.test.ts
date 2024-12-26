import { test, expect, beforeEach } from 'vitest';
import { Backoff, createBackoff } from '@/util/backoff'; // Adjusted import path

const initial = 100;
const multiplier = 2;
const maxTime = 1000;
const backoffConfig = { initial, multiplier, maxTime };
let backoff: Backoff;

beforeEach(() => {
  backoff = createBackoff(backoffConfig);
});

test('initializes with the initial backoff time', () => {
  expect(backoff.getBackoff()).toBe(initial);
});

test('increases backoff time correctly', () => {
  backoff.increaseBackoff();
  expect(backoff.getBackoff()).toBe(initial * multiplier);
});

test('does not exceed the maximum backoff time', () => {
  for (let i = 0; i < 10; i++) {
    backoff.increaseBackoff();
  }
  expect(backoff.getBackoff()).toBeLessThanOrEqual(maxTime);
});

test('resets backoff time', () => {
  backoff.increaseBackoff();
  backoff.resetBackoff();
  expect(backoff.getBackoff()).toBe(initial);
});
