import { expect, test } from 'vitest';
import { createPeriodicJob } from '@/util/periodic';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test('runs after start and stops scheduling', async () => {
  let runs = 0;
  const job = createPeriodicJob(async () => {
    runs += 1;
    await Promise.resolve();
  }, 0);

  expect(runs).toBe(0);

  job.start();
  await wait(10);

  expect(runs).toBeGreaterThanOrEqual(1);

  job.stop();
  const stoppedAt = runs;
  await wait(10);

  expect(runs).toBe(stoppedAt);
});

test('pauses and resumes the job', async () => {
  let runs = 0;
  const job = createPeriodicJob(async () => {
    runs += 1;
    await Promise.resolve();
  }, 0);

  job.start();
  await wait(10);

  job.pause();
  const pausedAt = runs;
  await wait(10);

  expect(runs).toBe(pausedAt);

  job.resume();
  await wait(10);

  expect(runs).toBeGreaterThan(pausedAt);

  job.stop();
});

test('stops cleanly from paused and can be started again', async () => {
  let runs = 0;
  const job = createPeriodicJob(async () => {
    runs += 1;
    await Promise.resolve();
  }, 0);

  job.start();
  await wait(5);

  job.pause();
  await wait(5);

  const pausedAt = runs;
  job.stop();
  await wait(10);

  expect(runs).toBe(pausedAt);

  job.start();
  await wait(10);

  expect(runs).toBeGreaterThan(pausedAt);

  job.stop();
});
