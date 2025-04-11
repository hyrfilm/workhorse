import fc, { Scheduler, Stream } from 'fast-check';
import { Payload, TaskExecutorStrategy, TaskResult } from '@/types';
import { describe, expect, it, test, vi } from 'vitest';
import { millisec, seconds } from '@/util/time.ts';
import { defaultOptions } from '@/config.ts';
import { createWorkhorseFixture } from './fixtures.ts';
import { createDatabaseStub } from './db/createDatabaseStub.ts';

vi.mock('@/db/createDatabase.ts', () => ({
  createDatabase: vi.fn(async () => await createDatabaseStub()),
}));

describe('fuzz tests - atomicity', () => {
  test('Tasks are processed atomically in the order they were added (high concurrency)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.scheduler(),

        fc.uniqueArray(fc.nat(), { minLength: 1, maxLength: 36 }),
        fc.integer({ min: 20, max: 100 }),
        async (scheduler, taskIds, concurrency) => {
          const executedTasks: string[] = [];
          const runTaskPromises: Promise<TaskResult>[] = [];
          const expectedIds = [...taskIds].map((id) => `${id}`);

          // Wrap `runTask` with scheduler and promise tracking
          const runTask = async (taskId: string, _payload: Payload): Promise<TaskResult> => {
            const taskPromise = scheduler.schedule(
              new Promise<TaskResult>((resolve) => {
                executedTasks.push(taskId);
                resolve(undefined);
              })
            );
            runTaskPromises.push(taskPromise); // Track each task's promise
            return await taskPromise;
          };

          const workhorse = await createWorkhorseFixture(runTask, { concurrency });

          // Queue tasks
          const queuePromises = taskIds.map((id) =>
            scheduler.schedule(workhorse.queue(`${id}`, {}))
          );
          await scheduler.waitFor(Promise.all(queuePromises));

          // Poll tasks
          const pollPromises = Array.from({ length: taskIds.length }, () =>
            scheduler.schedule(workhorse.poll())
          );
          await scheduler.waitFor(Promise.all(pollPromises));

          // Wait for all `runTask` promises
          await scheduler.waitFor(Promise.all(runTaskPromises));

          //console.log('expected: ', [...expectedIds]);
          //console.log('actual:   ', [...executedTasks]);
          // Validate the results
          expect(expectedIds).toEqual(executedTasks);
        }
      ),
      { verbose: 2, numRuns: 100 }
    );
  });

  test('Tasks are processed atomically in the order they were added (low concurrency)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.scheduler(),

        fc.uniqueArray(fc.nat(), { minLength: 1, maxLength: 36 }),
        fc.integer({ min: 1, max: 10 }),
        async (scheduler, taskIds, concurrency) => {
          const expectedIds = [...taskIds].map((id) => `${id}`);
          const actualIds: string[] = [];

          // Wrap `runTask` with scheduler and promise tracking
          const runTask = async (taskId: string, _payload: Payload): Promise<TaskResult> => {
            actualIds.push(taskId);
            return Promise.resolve(undefined);
          };

          // Create the workhorse instance
          const workhorse = await createWorkhorseFixture(runTask, { concurrency });

          const initialStatus = await workhorse.getStatus();
          let expectedStatus = { queued: 0, executing: 0, successful: 0, failed: 0 };
          expect(expectedStatus).toEqual(initialStatus);

          const addTasksSequence = expectedIds.map((taskId) => () => workhorse.queue(taskId, {}));
          scheduler.scheduleSequence(addTasksSequence);

          await scheduler.waitAll();

          const scheduledStatus = await workhorse.getStatus();
          expectedStatus = expectedStatus = {
            queued: taskIds.length,
            executing: 0,
            successful: 0,
            failed: 0,
          };
          expect(expectedStatus).toEqual(scheduledStatus);

          expectedStatus = { queued: 0, executing: 0, successful: taskIds.length, failed: 0 };
          let finalStatus = await workhorse.getStatus();
          while (finalStatus.successful !== expectedStatus.successful) {
            await workhorse.poll();
            finalStatus = await workhorse.getStatus();
          }

          //console.log('expected:', expectedStatus);
          //console.log('acctual: ', finalStatus);
          expect(expectedStatus).toEqual(finalStatus);
          expect(expectedIds).toEqual(actualIds);
        }
      ),
      { verbose: 2, numRuns: 100 }
    );
  });

  it('Fuzzing - tasks are processed atomically with retries until all succeed', async () => {
    // Helper to create a deterministic task runner using an infinite stream of probabilities
    const createTaskFunction = (taskProbStream: IterableIterator<number>) => {
      const executedTaskSet = new Set<string>();
      return async (taskId: string, _payload: Payload): Promise<TaskResult> => {
        // Use the next value from the probability stream
        const taskFailureProb = taskProbStream.next().value * 1.0;
        const currentFailureProb = taskProbStream.next().value * 2.0; // make the task have a slight bias towards success
        const shouldFail = taskFailureProb > currentFailureProb; // Fail if probability is lower
        if (shouldFail) {
          //console.log(`${taskId}`, 'failure: ', taskFailureProb, currentFailureProb);
          throw new Error(`Task ${taskId} failed`);
        } else {
          if (executedTaskSet.has(taskId)) {
            //console.log(`Task ${taskId} has already been executed`);
            throw new Error(`Task ${taskId} has already been executed`);
          }

          //console.log(`${taskId}`, 'succcess: ', taskFailureProb, currentFailureProb);
        }
        executedTaskSet.add(taskId);
        return Promise.resolve(undefined);
      };
    };

    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 36 }), // Unique task IDs
        fc.noShrink(fc.infiniteStream(fc.integer({ min: 0, max: 100 }))), // Infinite stream of probabilities
        fc.integer({ min: 30, max: 30 }), // Concurrency level
        async (taskIds, probabilityStream, concurrency) => {
          const totalTasks = taskIds.map((id) => id);
          const runTask = createTaskFunction(probabilityStream);

          const workhorse = await createWorkhorseFixture(runTask, {
            concurrency,
            taskExecution: TaskExecutorStrategy.DETACHED,
          });

          // Queue tasks
          const queuePromises = taskIds.map((id) => workhorse.queue(id, {}));
          await Promise.all(queuePromises);

          // Poll until all tasks succeed
          let done = false;
          while (!done) {
            await workhorse.poll();
            //console.log('Done polling');
            // Check the task queue status
            //console.log('Check status');
            const status = await workhorse.getStatus();
            //console.log('Status ', status);
            if (status.successful === totalTasks.length) {
              done = true;
            }
            //console.log('Done check status');
            if (status.failed > 0) {
              //console.log('*** requeuing')
              await workhorse.requeue();
              //const status = await workhorse.getStatus();
              //console.log('Status ', status);
            }
          }

          // Ensure all tasks were executed successfully
          expect(totalTasks.length).toBe((await workhorse.getStatus()).successful);
        }
      ),
      { verbose: 2, numRuns: 100 }
    );
  });
});

describe('fuzz tests - auto polling', () => {
  //TODO: Decide what to do with this one:
  // TODO: Should there be a shutdown method?
  test.concurrent('Fuzzing - start/stop', { timeout: seconds(30) }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 10 }),
        fc.infiniteStream(fc.boolean()),
        fc.integer({ min: 1, max: 10 }),
        async (taskIds: string[], coinToss: Stream<boolean>, concurrency: number) => {
          const executedTasks: string[] = [];
          const expectedIds = [...taskIds].map((id) => id);

          const runTask = (taskId: string, _payload: Payload): Promise<TaskResult> => {
            executedTasks.push(taskId);
            return new Promise((resolve) => {
              resolve(undefined);
            });
          };

          const options = defaultOptions();
          options.concurrency = concurrency;
          options.taskExecution = TaskExecutorStrategy.PARALLEL;
          options.poll.auto = true;
          options.poll.interval = millisec(1);
          const workhorse = await createWorkhorseFixture(runTask, options);

          // Queue tasks
          for (const taskId of taskIds) {
            await workhorse.queue(taskId, {});
          }

          // Randomly start/stop poller
          for (const result of coinToss) {
            if (result) {
              workhorse.startPoller();
            } else {
              workhorse.stopPoller();
            }

            const status = await workhorse.getStatus();
            if (status.queued === 0 && status.executing === 0) {
              break;
            }
            //console.log(status);
          }
          // TODO: Should workhorse.shutdown() be removed as part of the interface?
          // TODO: Only reason to keep it would be: freeing resources & removing db entirely?
          const finalStatus = await workhorse.getStatus();

          expect(finalStatus).toEqual({
            queued: 0,
            executing: 0,
            successful: taskIds.length,
            failed: 0,
          });

          // Ensure all tasks executed successfully
          expect(executedTasks).toEqual(expectedIds);
        }
      ),
      { verbose: 2, numRuns: 100 }
    );
  });
});

describe('fuzz tests - workhorse.run', () => {
  test.concurrent('workhorse.run', { timeout: seconds(30) }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.scheduler(), // param 1 = scheduler
        fc.integer({ min: 1, max: 10 }), // param 2 = concurrency
        fc.integer({ min: 1, max: 50 }), // param 3 = poll interval
        async (scheduler: Scheduler, concurrency: number, sleep) => {
          //console.time('startup');
          const runTask = async (_taskId: string, payload: Payload): Promise<TaskResult> => {
            return Promise.resolve(payload);
          };
          const config = defaultOptions();
          config.concurrency = concurrency;
          config.poll.interval = millisec(sleep);
          const workhorse = await createWorkhorseFixture(runTask);
          workhorse.startPoller();

          const expectedResults = [
            { taskId: 'task-1' },
            { taskId: 'task-2' },
            { taskId: 'task-3' },
          ];
          const taskIds = ['task-1', 'task-2', 'task-3'];
          const promises = [];

          // Note: The current workhorse.run() implementation is quite slow,
          // and you're almost always better of using workhorse.queue()
          // workhorse.run() is only useful when you need to await the return value of the task
          for (const taskId of taskIds) {
            promises.push(scheduler.schedule(workhorse.run(taskId, { taskId })));
          }
          //console.timeEnd('startup');
          //console.time('waiting')
          const actualResults = await scheduler.waitFor(Promise.all(promises));
          //console.timeEnd('waiting');
          expect(actualResults).toEqual(expectedResults);
        }
      ),
      { verbose: 2, numRuns: 20 }
    );
  });
});
