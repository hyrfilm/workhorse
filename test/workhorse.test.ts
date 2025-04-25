import fc from 'fast-check';
import { Payload, RunTask, TaskExecutorStrategy, TaskResult } from '@/types';
import { describe, expect, test, vi } from 'vitest';
import { seconds } from '@/util/time.ts';
import { createDatabaseStub } from './db/createDatabaseStub.ts';
import { createWorkhorse } from '@/workhorse.ts';

vi.mock('@/db/createDatabase.ts', () => ({
  createDatabase: vi.fn(async () => await createDatabaseStub()),
}));

interface Task {
  taskId: string;
  payload: Payload;
}

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

const assertTask = (maybeTask: unknown): maybeTask is Task => {
  return isValidTask(maybeTask);
};

describe('api tests', () => {
  test(
    'Typical usage - enqueue 1000 tasks & process them (serial strategy with manual polling)',
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
            { minLength: 0, maxLength: 10 }
          ),
          async (scheduler, tasksToRun) => {
            // TODO: Move this check + error handling to workhorse.queue() and verify payload can be stringified and read back to itself
            tasksToRun = tasksToRun.filter(isValidTask);

            const taskResults: TaskResult[] = [];

            const runTask: RunTask = async (taskId, payload) => {
              taskResults.push({ taskId, payload });
              return Promise.resolve(undefined);
            };

            const queueAndPoll = async (task: Task) => {
              await workhorse.poll();
              await workhorse.queue(task.taskId, task.payload);
            };

            // create a workhorse instance with the default config
            const workhorse = await createWorkhorse(runTask, {
              taskExecution: TaskExecutorStrategy.DETACHED,
              concurrency: 10,
            });
            //setLogLevel('debug');
            for (const task of tasksToRun) {
              assertTask(task);
              //console.log('Scheduling: ', task.taskId);
              const f = scheduler.scheduleFunction(queueAndPoll);
              f(task);
            }
            expect(scheduler.count()).toBe(tasksToRun.length);

            await scheduler.waitAll();

            expect(scheduler.count()).toBe(0);

            let status = await workhorse.getStatus();
            while (status.queued > 0 || status.executing > 0) {
              await workhorse.poll();
              status = await workhorse.getStatus();
              expect(status.failed).toBe(0);
            }
            expect(status.queued).toBe(0);
            expect(status.failed).toBe(0);
            expect(status.executing).toBe(0);
            expect(status.successful).toEqual(tasksToRun.length);

            expect(taskResults).toEqual(tasksToRun);
          }
        ),
        { verbose: 2, numRuns: 10 }
      );
    }
  );
});
