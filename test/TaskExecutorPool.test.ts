import { describe, expect, test } from 'vitest';
import { createExecutorPool } from '@/executor/TaskExecutorPool.ts';
import { createTaskExecutor } from '@/executor/TaskExecutor.ts';
import { defaultOptions } from '@/config.ts';

const hooks = {
  reserveHook: async () => {},
  executeHook: async () => {},
  successHook: async () => {},
  failureHook: async () => {},
};

describe('TaskExecutorPool', () => {
  test('startAll starts executors and waits for them to become ready', async () => {
    const config = defaultOptions();
    const executorA = createTaskExecutor(config, hooks);
    const executorB = createTaskExecutor(config, hooks);
    const pool = createExecutorPool(config, [executorA, executorB]);

    await pool.startAll();

    await Promise.all([executorA.waitFor('ready'), executorB.waitFor('ready')]);
    expect(executorA.getStatus()).toBe('started');
    expect(executorB.getStatus()).toBe('started');
  });

  test('stopAll waits until executors can stop before sending stop', async () => {
    const config = defaultOptions();
    const executor = createTaskExecutor(config, hooks);
    const pool = createExecutorPool(config, [executor]);

    await pool.startAll();
    executor.poll();
    await executor.waitFor('busy');
    await pool.stopAll();
    await executor.waitFor('stopped');
    expect(executor.getStatus()).toBe('stopped');
  });

  test('shutdown stops executors and clears the pool', async () => {
    const config = defaultOptions();
    const executor = createTaskExecutor(config, hooks);
    const pool = createExecutorPool(config, [executor]);

    await pool.startAll();
    await pool.shutdown();

    expect(executor.getStatus()).toBe('stopped');
    await pool.startAll();
    expect(executor.getStatus()).toBe('stopped');
  });
  // TODO: Implement tests for polling including each strategy (serial, parallel, detached)
  // the tests make sure each strategy works as expected but the test should be
  // blackboxy enough to not cause issues if the pooling / polling is split up
});
