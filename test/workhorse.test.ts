import fc from 'fast-check';
import { RunTask, TaskExecutorStrategy, TaskResult } from '@/types';
import { describe, expect, test, vi } from 'vitest';
import { seconds } from '@/util/time.ts';
import { createDatabaseStub } from './db/createDatabaseStub.ts';
import { createWorkhorse } from '@/workhorse.ts';
import { Subscriptions } from '@/events/eventTypes.ts';

vi.mock('@/db/createDatabase.ts', () => ({
  createDatabase: vi.fn(async () => await createDatabaseStub()),
}));

// TODO: This should be done when queuing and immediately throw OR allow primitives
const isValidTask = (task: unknown) => {
  // intentional null coercion
  if (task == null || typeof task !== 'object') {
    return false;
  }
  if (!('taskId' in task)) {
    return false;
  }
  if (!('payload' in task)) {
    return false;
  }
  const { taskId, payload } = task;
  if (typeof taskId !== 'string') {
    return false;
  }
  // intentional null coercion
  if (payload == null) {
    return false;
  }
  if (Array.isArray(payload)) {
    return false;
  }
  if (typeof payload !== 'object') {
    return false;
  }
  return true;
};

const executorStrategies = () => [
  TaskExecutorStrategy.SERIAL,
  TaskExecutorStrategy.PARALLEL,
  TaskExecutorStrategy.SERIAL,
];

describe.concurrent('api tests', () => {
  test(
    'Typical usage - enqueue 0-1000 tasks & process them (with manual polling)',
    { timeout: seconds(30) },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.scheduler(),
          fc.array(
            fc.record({
              taskId: fc.uuid({ version: 4 }),
              payload: fc.jsonValue(),
            }),
            { minLength: 0, maxLength: 1000 }
          ),
          fc.constantFrom(...executorStrategies()),
          fc.integer({ min: 1, max: 10 }),
          async (scheduler, tasksToRun, executorStrategy, concurrency) => {
            // TODO: Move this check + error handling to workhorse.queue() and verify payload can be stringified and read back to itself
            tasksToRun = tasksToRun.filter(isValidTask);
            const taskResults: TaskResult[] = [];

            const runTask: RunTask = async (taskId, payload) => {
              taskResults.push({ taskId, payload });
              return Promise.resolve(undefined);
            };

            const workhorse = await createWorkhorse(runTask, {
              taskExecution: executorStrategy,
              concurrency,
            });

            tasksToRun.forEach((task) => {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              scheduler.schedule(workhorse.queue(task.taskId, task.payload));
            });

            expect(scheduler.count()).toBe(tasksToRun.length);

            await scheduler.waitAll();

            expect(scheduler.count()).toBe(0);

            const taskMonitor = { remaining: tasksToRun.length };
            workhorse.subscribe(Subscriptions.TaskMonitor.Updated, (monitor) => {
              taskMonitor.remaining = monitor.remaining;
            });

            while (taskMonitor.remaining !== 0) {
              await workhorse.poll();
            }
            const status = await workhorse.getStatus();
            expect(status).toEqual({
              queued: 0,
              failed: 0,
              executing: 0,
              successful: tasksToRun.length,
            });
            // We do this because since we transforms the payload of each task to JSON there's
            // a small chance that when parsed it will differ from the original
            // (eg JSON.parse(JSON.stringify({"": -0})) !== JSON.parse(JSON.stringify({"": 0})))
            expect(JSON.stringify(taskResults)).toEqual(JSON.stringify(tasksToRun));
          }
        ),
        { verbose: 2, numRuns: 500 }
      );
    }
  );
});
