import fc from "fast-check";
import {Payload, RunTask, WorkhorseConfig} from "@/types";
import { createWorkhorse } from "@/workhorse";
import { test, expect, vi } from "vitest";
import { createDatabaseStub } from "./db/createDatabaseStub";
import { createTaskQueue } from "@/db/TaskQueue";
import { createTaskRunner } from "@/TaskRunner";
import { createTaskExecutor } from "@/machines/TaskExecutorMachine";
import { createExecutorPool } from "@/ExecutorPool";

vi.mock("@/db/createDatabase.ts", () => ({
  createDatabase: vi.fn(async () => await createDatabaseStub()),
}));

// Returns a workhorse instance that's identical to a regular one except that it
// runs on node.js with an in-memory sqlite db.
async function createWorkhorseFixture(runTask: RunTask, options?: Partial<WorkhorseConfig>) {
    const workhorse = await createWorkhorse(runTask, {
        ...options,
        factories: {
            createDatabase: createDatabaseStub,
            createTaskQueue: createTaskQueue,
            createTaskRunner: createTaskRunner,
            createTaskExecutor: createTaskExecutor,
            createExecutorPool: createExecutorPool,
        },
    });
    return workhorse;
}

test("Tasks are processed atomically in the order they were added (high concurrency)", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.scheduler(),

      fc.uniqueArray(fc.nat(), { minLength: 1, maxLength: 36 }),
      // TODO: This is annoying, lowering the concurrency can result in some tasks not being picked up when running all promises through fast-check's schedule
      fc.integer({ min: 20, max: 100 }),
      async (scheduler, taskIds, concurrency) => {
        const executedTasks: string[] = [];
        const runTaskPromises: Promise<void>[] = [];
        const expectedIds = [...taskIds].map((id) => `${id}`);

        // Wrap `runTask` with scheduler and promise tracking
        const runTask = async (taskId: string, _payload: Payload): Promise<void> => {
          const taskPromise = scheduler.schedule(
            new Promise<void>((resolve) => {
              executedTasks.push(taskId);
              resolve();
            })
          );
          runTaskPromises.push(taskPromise); // Track each task's promise
          await taskPromise;
        };

        const workhorse = await createWorkhorseFixture(runTask, { concurrency })
/*
        const workhorse = await createWorkhorse(runTask, {
          concurrency,
          factories: {
            createDatabase: createDatabaseStub,
            createTaskQueue: createTaskQueue,
            createTaskRunner: createTaskRunner,
            createTaskExecutor: createTaskExecutor,
            createExecutorPool: createExecutorPool,
          },
        });
*/
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

        await workhorse.stop();

        //console.log('expected: ', [...expectedIds]);
        //console.log('actual:   ', [...executedTasks]);
        // Validate the results
        expect(expectedIds).toEqual(executedTasks);
      }
    )
  , {verbose: 2, numRuns: 100});
});

test("Tasks are processed atomically in the order they were added (low concurrency)", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.scheduler(),

      fc.uniqueArray(fc.nat(), { minLength: 1, maxLength: 36 }),
      fc.integer({ min: 1, max: 10 }),
      async (scheduler, taskIds, concurrency) => {
        const expectedIds = [...taskIds].map((id) => `${id}`);
        const actualIds: string[] = [];

        // Wrap `runTask` with scheduler and promise tracking
        const runTask = async (taskId: string, _payload: Payload): Promise<void> => {
          actualIds.push(taskId);
          return Promise.resolve();
        };

        // Create the workhorse instance
          const workhorse = await createWorkhorseFixture(runTask, { concurrency });

          const initialStatus = await workhorse.getStatus();
        let expectedStatus = { queued: 0, executing: 0, successful: 0, failed: 0};
        expect(expectedStatus).toEqual(initialStatus);

        const addTasksSequence = expectedIds.map((taskId) => () => workhorse.queue(taskId, {}));
        scheduler.scheduleSequence(addTasksSequence);

        await scheduler.waitAll();

        const scheduledStatus = await workhorse.getStatus();
        expectedStatus = expectedStatus = { queued: taskIds.length, executing: 0, successful: 0, failed: 0};
        expect(expectedStatus).toEqual(scheduledStatus);

        expectedStatus = { queued: 0, executing: 0, successful: taskIds.length, failed: 0};
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
    )
  , {verbose: 2, numRuns: 100});
});