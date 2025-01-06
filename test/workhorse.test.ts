import fc from "fast-check";
import {Payload, PollStrategy, RunTask, WorkhorseConfig} from "@/types";
import {createWorkhorse} from "@/workhorse";
import {expect, test, vi} from "vitest";
import {createDatabaseStub} from "./db/createDatabaseStub";
import {createTaskQueue} from "@/queue/TaskQueue.ts";
import {createTaskHooks} from "@/executor/TaskHooks.ts";
import {createTaskExecutor} from "@/executor/TaskExecutor";
import {createExecutorPool} from "@/executor/TaskExecutorPool.ts";
import {WorkhorseShutdownError} from "@/errors.ts";

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
            createHooks: createTaskHooks,
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

test("Fuzzing - start/stop", async () => {
    await fc.assert(
        fc.asyncProperty(
            fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 36 }),
            fc.noShrink(fc.infiniteStream(fc.noBias(fc.boolean()))),
            fc.integer({ min: 50, max: 100 }),
            async (taskIds, startStop, concurrency) => {
                const executedTasks: string[] = [];
                const expectedIds = [...taskIds].map((id) => `${id}`);

                const runTask = async (taskId: string, _payload: Payload): Promise<void> => {
                    executedTasks.push(taskId);
                    return Promise.resolve();
                };

                const workhorse = await createWorkhorseFixture(runTask, { concurrency, pollStrategy: PollStrategy.PARALLEL });

                // Queue tasks
                for (const taskId of taskIds) {
                    await workhorse.queue(`${taskId}`, {});
                }

                // Randomly start/stop workhorse while polling tasks
                let shouldContinue = true;
                while (shouldContinue) {
                    const start = startStop.next().value;
                    if (start) {
                        await workhorse.start();
                    } else {
                        await workhorse.stop();
                    }

                    await workhorse.poll();
                    const status = await workhorse.getStatus();

                    shouldContinue = status.queued > 0 || status.executing > 0;
                }

                await workhorse.stop();


                // destroy the instance
                const finalStatus = await workhorse.shutdown();

                expect(finalStatus).toEqual({
                    queued: 0,
                    executing: 0,
                    successful: taskIds.length,
                    failed: 0,
                });

                // Ensure all tasks executed successfully
                expect(executedTasks).toEqual(expectedIds);

                // Verify all methods throw after shutdown
                const methodsToTest = [
                    () => workhorse.queue("task-2", { key: "value" }),
                    () => workhorse.getStatus(),
                    () => workhorse.poll(),
                    () => workhorse.start(),
                    () => workhorse.stop(),
                    () => workhorse.requeue(),
                ];

                for (const method of methodsToTest) {
                    await expect(method()).rejects.toThrow(WorkhorseShutdownError);
                }
            }
        ),
        { verbose: 2, numRuns: 100 }
    );
});

test("Fuzzing - tasks are processed atomically with retries until all succeed", async () => {
    // Helper to create a deterministic task runner using an infinite stream of probabilities
    const createTaskFunction = (taskProbStream: IterableIterator<number>) => {
        const executedTaskSet = new Set<string>();
        return async (taskId: string, _payload: Payload): Promise<void> => {
            // Use the next value from the probability stream
            const taskFailureProb = taskProbStream.next().value;
            const currentFailureProb = taskProbStream.next().value*2.0; // make the task have a slight bias towards success
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
        };
    };

    await fc.assert(
        fc.asyncProperty(
            fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 36 }), // Unique task IDs
            fc.noShrink(fc.infiniteStream(fc.integer({ min: 0, max: 100 }))), // Infinite stream of probabilities
            fc.integer({ min: 30, max: 30 }), // Concurrency level
            async (taskIds, probabilityStream, concurrency) => {
                const totalTasks = taskIds.map((id) => `${id}`);
                const runTask = createTaskFunction(probabilityStream);

                const workhorse = await createWorkhorseFixture(runTask, { concurrency, pollStrategy: PollStrategy.NO_WAIT });

                // Queue tasks
                const queuePromises = taskIds.map((id) =>
                    workhorse.queue(`${id}`, {})
                );
                await Promise.all(queuePromises);

                // Poll until all tasks succeed
                while (true) {
                    await workhorse.poll();
                    //console.log('Done polling');
                    // Check the task queue status
                    //console.log('Check status');
                    const status = await workhorse.getStatus();
                    //console.log('Status ', status);
                    if (status.successful === totalTasks.length) {
                        break;
                    }
                    //console.log('Done check status');
                    if (status.failed>0) {
                        //console.log('*** requeuing')
                        await workhorse.requeue();
                        const status = await workhorse.getStatus();
                        //console.log('Status ', status);
                    }
                }

                await workhorse.stop();

                // Ensure all tasks were executed successfully
                expect(totalTasks.length).toBe((await workhorse.getStatus()).successful);
            }
        ),
        { verbose: 2, numRuns: 100},
    );
});


