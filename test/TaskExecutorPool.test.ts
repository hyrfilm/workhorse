import { describe, expect, test } from 'vitest';
import { createExecutorPool } from '@/executor/TaskExecutorPool.ts';
import { createTaskExecutor } from '@/executor/TaskExecutor.ts';
import { defaultOptions } from '@/config.ts';
import { TaskExecutorStrategy, TaskHooks } from '@/types.ts';
import { UnreachableError } from '@/errors.ts';

const resolvedHooks: TaskHooks = {
  reserveHook: async () => {},
  executeHook: async () => {},
  successHook: async () => {},
  failureHook: async () => {},
};

const createControlledHooks = () => {
  let releaseReserve!: () => void;
  let releaseExecute!: () => void;

  const reservePromise = new Promise<void>((resolve) => {
    releaseReserve = resolve;
  });
  const executePromise = new Promise<void>((resolve) => {
    releaseExecute = resolve;
  });

  const hooks: TaskHooks = {
    reserveHook: async () => {
      await reservePromise;
    },
    executeHook: async () => {
      await executePromise;
    },
    successHook: async () => {},
    failureHook: async () => {},
  };

  return { hooks, releaseReserve, releaseExecute };
};

const nextTick = () => new Promise((resolve) => queueMicrotask(resolve));

describe('TaskExecutorPool', () => {
  test('startAll starts executors and waits for them to become ready', async () => {
    const config = defaultOptions();
    const executorA = createTaskExecutor(config, resolvedHooks);
    const executorB = createTaskExecutor(config, resolvedHooks);
    const pool = createExecutorPool(config, [executorA, executorB]);

    await pool.startAll();

    await Promise.all([executorA.waitFor('ready'), executorB.waitFor('ready')]);
    expect(executorA.getStatus()).toBe('started');
    expect(executorB.getStatus()).toBe('started');
  });

  test('stopAll waits until executors can stop before sending stop', async () => {
    const config = defaultOptions();
    const { hooks, releaseReserve, releaseExecute } = createControlledHooks();
    const executor = createTaskExecutor(config, hooks);
    const pool = createExecutorPool(config, [executor]);

    await pool.startAll();
    executor.poll();
    await executor.waitFor('busy');

    const stopPromise = pool.stopAll();
    let settled = false;
    stopPromise.then(() => {
      settled = true;
    });

    releaseReserve();
    await nextTick();
    expect(settled).toBe(false);
    expect(executor.getStatus()).toBe('started');

    releaseExecute();
    await stopPromise;

    expect(settled).toBe(true);
    expect(executor.getStatus()).toBe('stopped');
  });

  test('shutdown stops executors and clears the pool', async () => {
    const config = defaultOptions();
    const executor = createTaskExecutor(config, resolvedHooks);
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
